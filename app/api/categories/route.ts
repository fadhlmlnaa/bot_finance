import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const type = searchParams.get("type") as "INCOME" | "EXPENSE" | null;

    const whereClause: Record<string, unknown> = {};

    if (phoneNumber) {
      whereClause.OR = [
        { user: { phoneNumber } },
        { userId: null },
      ];
    }

    if (type && (type === "INCOME" || type === "EXPENSE")) {
      whereClause.type = type;
    }

    const categories = await prisma.category.findMany({
      where: whereClause,
      orderBy: {
        name: "asc",
      },
    });

    // Deduplicate categories by lowercase name & type
    const seen = new Set<string>();
    const uniqueCategories = [];
    for (const cat of categories) {
      const key = `${cat.name.trim().toLowerCase()}_${cat.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCategories.push(cat);
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: uniqueCategories.length,
        data: uniqueCategories,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch categories",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, phoneNumber } = body;

    if (!name || !type) {
      return NextResponse.json(
        {
          success: false,
          message: "Fields 'name' and 'type' are required.",
        },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();

    // Check if category already exists anywhere with same name & type
    let category = await prisma.category.findFirst({
      where: {
        name: { equals: cleanName, mode: "insensitive" },
        type,
      },
    });

    if (category) {
      return NextResponse.json(
        {
          success: true,
          message: "Category already exists",
          data: category,
        },
        { status: 200 }
      );
    }

    let userId: string | null = null;
    if (phoneNumber) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: String(phoneNumber).trim() },
            { phoneNumber: "62" + String(phoneNumber).trim().replace(/^0/, "") },
            { phoneNumber: "0" + String(phoneNumber).trim().replace(/^62/, "") },
          ],
        },
      });
      if (user) {
        userId = user.id;
      }
    }

    category = await prisma.category.create({
      data: {
        name: cleanName,
        type,
        userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Category created",
        data: category,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create category",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

