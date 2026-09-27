import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inferCategoryName } from "@/lib/categorizer";
import { checkUserQuota } from "@/lib/subscription";
import { syncTransactionToGoogleSheet } from "@/lib/sheets";
import { inferPaymentMethod } from "@/bot/parser";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      userId,
      description,
      amount,
      type,
      paymentMethod,
      categoryId,
      category,
      categoryName,
      date,
    } = body;

    // Validation
    if ((!phoneNumber && !userId) || !description || amount === undefined || !type) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: phoneNumber (or userId), description, amount, and type are required.",
        },
        { status: 400 }
      );
    }

    if (type !== "EXPENSE" && type !== "INCOME") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid type. Must be either 'EXPENSE' or 'INCOME'.",
        },
        { status: 400 }
      );
    }

    const parsedAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount must be a positive number.",
        },
        { status: 400 }
      );
    }

    // Resolve Payment Method
    const rawMethod = paymentMethod?.toString().toUpperCase();
    let resolvedPaymentMethod: "CASH" | "BANK" | "E_WALLET" = "CASH";
    if (rawMethod === "BANK" || rawMethod === "CASH" || rawMethod === "E_WALLET") {
      resolvedPaymentMethod = rawMethod;
    } else if (rawMethod === "EWALLET") {
      resolvedPaymentMethod = "E_WALLET";
    } else {
      resolvedPaymentMethod = inferPaymentMethod(String(description), type);
    }

    // Normalize phone number if provided
    let cleanPhone = "";
    if (phoneNumber) {
      cleanPhone = String(phoneNumber).trim().replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    }

    // Lookup or Upsert User
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && cleanPhone) {
      user = await prisma.user.upsert({
        where: { phoneNumber: cleanPhone },
        update: {},
        create: {
          phoneNumber: cleanPhone,
          name: `User ${cleanPhone.slice(-4)}`,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check Membership & Monthly Quota
    const quota = await checkUserQuota(user);
    if (!quota.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          code: "QUOTA_EXCEEDED",
          message: `Kuota transaksi bulanan Anda telah habis (${quota.used}/${quota.maxQuota} transaksi). Silakan upgrade paket langganan Anda.`,
          quota,
        },
        { status: 403 }
      );
    }

    // Resolve Category
    let resolvedCategoryId: string | null = categoryId || null;

    if (!resolvedCategoryId) {
      const targetCategoryName =
        (category || categoryName)?.toString().trim() ||
        inferCategoryName(String(description).trim(), type);

      if (targetCategoryName) {
        // Find existing category matching name & type anywhere in DB
        let matchedCategory = await prisma.category.findFirst({
          where: {
            name: { equals: targetCategoryName, mode: "insensitive" },
            type: type,
          },
          orderBy: [
            { userId: "asc" },
          ],
        });

        // If not found, create new shared category
        if (!matchedCategory) {
          matchedCategory = await prisma.category.create({
            data: {
              name: targetCategoryName,
              type: type,
              userId: null,
            },
          });
        }

        resolvedCategoryId = matchedCategory.id;
      }
    }

    // Create Transaction connected to User & Category
    const transaction = await prisma.transaction.create({
      data: {
        amount: parsedAmount,
        description: String(description).trim(),
        type,
        paymentMethod: resolvedPaymentMethod,
        userId: user.id,
        categoryId: resolvedCategoryId,
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Auto-sync to Google Sheets if configured (asynchronous non-blocking)
    void syncTransactionToGoogleSheet(transaction, user);

    return NextResponse.json(
      {
        success: true,
        message: "Transaction recorded",
        data: transaction,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to record transaction",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const categoryId = searchParams.get("categoryId");
    const categoryName = searchParams.get("category");
    const type = searchParams.get("type") as "INCOME" | "EXPENSE" | null;

    const whereClause: Record<string, unknown> = {};

    if (phoneNumber) {
      whereClause.user = { phoneNumber };
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (categoryName) {
      whereClause.category = {
        name: { equals: categoryName, mode: "insensitive" },
      };
    }

    if (type && (type === "INCOME" || type === "EXPENSE")) {
      whereClause.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: {
        date: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: transactions.length,
        data: transactions,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch transactions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
