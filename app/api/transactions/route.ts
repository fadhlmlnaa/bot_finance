import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inferCategoryName } from "@/lib/categorizer";
import { checkUserQuota } from "@/lib/subscription";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, description, amount, type, categoryId, category, categoryName } = body;

    // Validation
    if (!phoneNumber || !description || amount === undefined || !type) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields: phoneNumber, description, amount, and type are required.",
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

    // Upsert User based on phoneNumber
    const user = await prisma.user.upsert({
      where: { phoneNumber: String(phoneNumber).trim() },
      update: {},
      create: {
        phoneNumber: String(phoneNumber).trim(),
        name: `User ${String(phoneNumber).trim().slice(-4)}`,
      },
    });

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
        // Find existing category for user or global
        let matchedCategory = await prisma.category.findFirst({
          where: {
            name: { equals: targetCategoryName, mode: "insensitive" },
            type: type,
            OR: [{ userId: user.id }, { userId: null }],
          },
        });

        // If not found, create new category for this user
        if (!matchedCategory) {
          matchedCategory = await prisma.category.create({
            data: {
              name: targetCategoryName,
              type: type,
              userId: user.id,
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
        userId: user.id,
        categoryId: resolvedCategoryId,
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
