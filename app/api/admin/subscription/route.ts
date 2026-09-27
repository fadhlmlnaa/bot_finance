import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserQuota } from "@/lib/subscription";
import { SubscriptionPlan } from "@prisma/client";

/**
 * Update user subscription, monthly quota, admin status, and name
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      phoneNumber,
      plan,
      durationDays,
      subscriptionEnd,
      monthlyQuota,
      customQuota,
      isAdmin,
      name,
    } = body;

    if (!userId && !phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Either 'userId' or 'phoneNumber' is required.",
        },
        { status: 400 }
      );
    }

    // Normalize phone if provided
    let cleanPhone = "";
    if (phoneNumber) {
      cleanPhone = String(phoneNumber).trim().replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    }

    // Find User
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && cleanPhone) {
      user = await prisma.user.findUnique({ where: { phoneNumber: cleanPhone } });
    }

    if (!user && cleanPhone) {
      // Auto create if not exist
      user = await prisma.user.create({
        data: {
          phoneNumber: cleanPhone,
          name: name || `User ${cleanPhone.slice(-4)}`,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    // 1. Plan update
    if (plan) {
      if (!Object.values(SubscriptionPlan).includes(plan)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(", ")}`,
          },
          { status: 400 }
        );
      }
      updateData.plan = plan;

      // Calculate default quota if quota not explicitly provided
      if (monthlyQuota === undefined && customQuota === undefined) {
        if (plan === SubscriptionPlan.PRO) updateData.monthlyQuota = 200;
        else if (plan === SubscriptionPlan.UNLIMITED) updateData.monthlyQuota = 99999;
        else if (plan === SubscriptionPlan.FREE) updateData.monthlyQuota = 20;
      }
    }

    // 2. Custom Monthly Quota update (Edit maks transaksi)
    const newQuota = monthlyQuota !== undefined ? monthlyQuota : customQuota;
    if (newQuota !== undefined) {
      const parsedQuota = parseInt(newQuota);
      if (isNaN(parsedQuota) || parsedQuota < 0) {
        return NextResponse.json(
          { success: false, message: "monthlyQuota must be a valid non-negative number." },
          { status: 400 }
        );
      }
      updateData.monthlyQuota = parsedQuota;
    }

    // 3. Subscription duration / end date update
    if (subscriptionEnd !== undefined) {
      updateData.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
    } else if (durationDays !== undefined) {
      const days = parseInt(durationDays);
      if (days > 0) {
        const end = new Date();
        end.setDate(end.getDate() + days);
        updateData.subscriptionEnd = end;
      } else {
        updateData.subscriptionEnd = null;
      }
    } else if (plan && plan !== SubscriptionPlan.FREE && !user.subscriptionEnd) {
      // Default 30 days if activating paid plan without duration
      const end = new Date();
      end.setDate(end.getDate() + 30);
      updateData.subscriptionEnd = end;
    } else if (plan === SubscriptionPlan.FREE && durationDays === undefined && subscriptionEnd === undefined) {
      updateData.subscriptionEnd = null;
    }

    // 4. Admin flag update
    if (isAdmin !== undefined) {
      updateData.isAdmin = Boolean(isAdmin);
    }

    // 5. Name update
    if (name !== undefined) {
      updateData.name = String(name).trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const quotaStatus = await checkUserQuota(updatedUser);

    return NextResponse.json(
      {
        success: true,
        message: `User ${updatedUser.phoneNumber} successfully updated.`,
        data: {
          user: {
            id: updatedUser.id,
            phoneNumber: updatedUser.phoneNumber,
            name: updatedUser.name,
            isAdmin: updatedUser.isAdmin,
            plan: updatedUser.plan,
            monthlyQuota: updatedUser.monthlyQuota,
            subscriptionEnd: updatedUser.subscriptionEnd,
            createdAt: updatedUser.createdAt,
          },
          quota: quotaStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating subscription/quota:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user subscription and quota",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function PATCH(request: Request) {
  return POST(request);
}

/**
 * Fetch list of all users with real-time quota usage and filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const planFilter = searchParams.get("plan");

    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { phoneNumber: { contains: search } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (planFilter && Object.values(SubscriptionPlan).includes(planFilter as SubscriptionPlan)) {
      whereClause.plan = planFilter as SubscriptionPlan;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    const userList = await Promise.all(
      users.map(async (user) => {
        const quota = await checkUserQuota(user);
        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          isAdmin: user.isAdmin,
          plan: user.plan,
          monthlyQuota: user.monthlyQuota,
          subscriptionEnd: user.subscriptionEnd,
          totalTransactionsCount: user._count.transactions,
          usage: {
            used: quota.used,
            maxQuota: quota.maxQuota,
            remaining: quota.remaining,
            isAllowed: quota.isAllowed,
            isUnlimited: quota.isUnlimited,
            expiresAt: quota.expiresAt,
          },
          createdAt: user.createdAt,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        count: userList.length,
        users: userList,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user subscriptions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
