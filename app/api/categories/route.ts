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

    return NextResponse.json(
      {
        success: true,
        count: categories.length,
        data: categories,
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

    let userId: string | null = null;
    if (phoneNumber) {
      const user = await prisma.user.upsert({
        where: { phoneNumber: String(phoneNumber).trim() },
        update: {},
        create: {
          phoneNumber: String(phoneNumber).trim(),
        },
      });
      userId = user.id;
    }

    const category = await prisma.category.create({
      data: {
        name: String(name).trim(),
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
