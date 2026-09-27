import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserQuota, updateUserSubscription } from "@/lib/subscription";
import { SubscriptionPlan } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, plan, durationDays, customQuota } = body;

    if (!phoneNumber || !plan) {
      return NextResponse.json(
        {
          success: false,
          message: "Fields 'phoneNumber' and 'plan' (FREE | PRO | UNLIMITED) are required.",
        },
        { status: 400 }
      );
    }

    if (!Object.values(SubscriptionPlan).includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserSubscription({
      phoneNumber,
      plan,
      durationDays: durationDays ? parseInt(durationDays) : 30,
      customQuota: customQuota !== undefined ? parseInt(customQuota) : undefined,
    });

    const quotaStatus = await checkUserQuota(updatedUser);

    return NextResponse.json(
      {
        success: true,
        message: `Subscription for ${phoneNumber} successfully updated to ${plan}`,
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          plan: updatedUser.plan,
          monthlyQuota: updatedUser.monthlyQuota,
          subscriptionEnd: updatedUser.subscriptionEnd,
        },
        quotaStatus,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update subscription",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userList = await Promise.all(
      users.map(async (user) => {
        const quota = await checkUserQuota(user);
        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          plan: user.plan,
          monthlyQuota: user.monthlyQuota,
          subscriptionEnd: user.subscriptionEnd,
          usage: {
            used: quota.used,
            maxQuota: quota.maxQuota,
            remaining: quota.remaining,
            isAllowed: quota.isAllowed,
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
