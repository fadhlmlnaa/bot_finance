import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.user.count();
    const freeUsers = await prisma.user.count({ where: { plan: "FREE" } });
    const proUsers = await prisma.user.count({ where: { plan: "PRO" } });
    const unlimitedUsers = await prisma.user.count({ where: { plan: "UNLIMITED" } });
    const adminUsers = await prisma.user.count({ where: { isAdmin: true } });

    const totalTransactions = await prisma.transaction.count();

    const transactions = await prisma.transaction.findMany({
      select: { amount: true, type: true },
    });

    let totalIncomeVolume = 0;
    let totalExpenseVolume = 0;

    for (const trx of transactions) {
      if (trx.type === "INCOME") {
        totalIncomeVolume += trx.amount;
      } else {
        totalExpenseVolume += trx.amount;
      }
    }

    // Recent 5 registered users
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        plan: true,
        monthlyQuota: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          metrics: {
            totalUsers,
            freeUsers,
            proUsers,
            unlimitedUsers,
            adminUsers,
            activePaidSubscriptions: proUsers + unlimitedUsers,
            totalTransactions,
            totalIncomeVolume,
            totalExpenseVolume,
          },
          recentUsers,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error generating admin dashboard stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin dashboard statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
