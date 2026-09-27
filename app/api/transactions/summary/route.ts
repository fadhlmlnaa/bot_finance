import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    const whereClause: Record<string, unknown> = {};
    let cleanPhone = "";
    let userRecord = null;

    if (phoneNumber) {
      cleanPhone = phoneNumber.trim().replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
      whereClause.user = { phoneNumber: cleanPhone };

      userRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: cleanPhone },
            { phoneNumber: cleanPhone.replace(/^62/, "0") },
          ],
        },
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    let bankIncome = 0;
    let bankExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let walletIncome = 0;
    let walletExpense = 0;

    const categoryBreakdown: Record<
      string,
      { categoryId: string | null; name: string; type: string; total: number; count: number }
    > = {};

    for (const trx of transactions) {
      const isIncome = trx.type === "INCOME";
      const method = trx.paymentMethod || "CASH";

      if (isIncome) {
        totalIncome += trx.amount;
        if (method === "BANK") bankIncome += trx.amount;
        else if (method === "E_WALLET") walletIncome += trx.amount;
        else cashIncome += trx.amount;
      } else {
        totalExpense += trx.amount;
        if (method === "BANK") bankExpense += trx.amount;
        else if (method === "E_WALLET") walletExpense += trx.amount;
        else cashExpense += trx.amount;
      }

      const catName = trx.category ? trx.category.name : "Tanpa Kategori";
      const catKey = `${trx.type}_${catName}`;

      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = {
          categoryId: trx.categoryId,
          name: catName,
          type: trx.type,
          total: 0,
          count: 0,
        };
      }

      categoryBreakdown[catKey].total += trx.amount;
      categoryBreakdown[catKey].count += 1;
    }

    const expenseCategories = Object.values(categoryBreakdown)
      .filter((c) => c.type === "EXPENSE")
      .sort((a, b) => b.total - a.total);

    const incomeCategories = Object.values(categoryBreakdown)
      .filter((c) => c.type === "INCOME")
      .sort((a, b) => b.total - a.total);

    const initialBalance = userRecord?.initialBalance || 0;
    const initialBankBalance = userRecord?.initialBankBalance || 0;
    const initialCashBalance = userRecord?.initialCashBalance || 0;

    const netBalance = totalIncome - totalExpense;
    const finalBalance = initialBalance + netBalance;

    const bankBalance = initialBankBalance + (bankIncome - bankExpense);
    const cashBalance = initialCashBalance + (cashIncome - cashExpense);
    const walletBalance = walletIncome - walletExpense;

    return NextResponse.json(
      {
        success: true,
        summary: {
          initialBalance,
          initialBankBalance,
          initialCashBalance,
          totalIncome,
          totalExpense,
          netBalance,
          finalBalance,
          balance: finalBalance,
          transactionCount: transactions.length,
          byPaymentMethod: {
            bank: {
              initial: initialBankBalance,
              income: bankIncome,
              expense: bankExpense,
              balance: bankBalance,
            },
            cash: {
              initial: initialCashBalance,
              income: cashIncome,
              expense: cashExpense,
              balance: cashBalance,
            },
            eWallet: {
              income: walletIncome,
              expense: walletExpense,
              balance: walletBalance,
            },
          },
        },
        expenseByCategory: expenseCategories,
        incomeByCategory: incomeCategories,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate financial summary",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
