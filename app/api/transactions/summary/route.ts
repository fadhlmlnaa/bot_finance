import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    const whereClause: Record<string, unknown> = {};
    if (phoneNumber) {
      whereClause.user = { phoneNumber };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown: Record<
      string,
      { categoryId: string | null; name: string; type: string; total: number; count: number }
    > = {};

    for (const trx of transactions) {
      if (trx.type === "INCOME") {
        totalIncome += trx.amount;
      } else {
        totalExpense += trx.amount;
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

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: transactions.length,
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
