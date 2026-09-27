import { prisma } from "./prisma";
import { SubscriptionPlan, User } from "@prisma/client";

export interface QuotaStatus {
  isAllowed: boolean;
  used: number;
  maxQuota: number;
  remaining: number;
  plan: SubscriptionPlan;
  expiresAt: Date | null;
  isUnlimited: boolean;
}

/**
 * Returns the start of the current month (00:00:00) in local/WIB time
 */
export function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Checks and validates a user's subscription and current monthly quota usage
 */
export async function checkUserQuota(user: User): Promise<QuotaStatus> {
  const now = new Date();
  let currentPlan = user.plan;
  let currentQuota = user.monthlyQuota;
  let expiresAt = user.subscriptionEnd;

  // 1. Check if subscription is expired
  if (user.plan !== SubscriptionPlan.FREE && user.subscriptionEnd && user.subscriptionEnd < now) {
    // Subscription has expired -> auto downgrade to FREE
    currentPlan = SubscriptionPlan.FREE;
    currentQuota = 20; // Default FREE quota
    expiresAt = null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: SubscriptionPlan.FREE,
        monthlyQuota: 20,
        subscriptionEnd: null,
      },
    });
  }

  // 2. Count transactions in the current month
  const startOfMonth = getStartOfMonth();
  const used = await prisma.transaction.count({
    where: {
      userId: user.id,
      date: { gte: startOfMonth },
    },
  });

  const isUnlimited = currentPlan === SubscriptionPlan.UNLIMITED;
  const isAllowed = isUnlimited || used < currentQuota;
  const remaining = isUnlimited ? 999999 : Math.max(0, currentQuota - used);

  return {
    isAllowed,
    used,
    maxQuota: currentQuota,
    remaining,
    plan: currentPlan,
    expiresAt,
    isUnlimited,
  };
}

/**
 * Admin utility to update a user's subscription plan, duration, and custom quota
 */
export async function updateUserSubscription({
  phoneNumber,
  plan,
  durationDays,
  customQuota,
}: {
  phoneNumber: string;
  plan: SubscriptionPlan;
  durationDays?: number;
  customQuota?: number;
}) {
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  let quota = customQuota;
  if (quota === undefined || quota === null) {
    if (plan === SubscriptionPlan.PRO) quota = 200;
    else if (plan === SubscriptionPlan.UNLIMITED) quota = 99999;
    else quota = 20; // FREE
  }

  let subscriptionEnd: Date | null = null;
  if (plan !== SubscriptionPlan.FREE) {
    const days = durationDays && durationDays > 0 ? durationDays : 30;
    subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + days);
  }

  const updatedUser = await prisma.user.upsert({
    where: { phoneNumber: cleanPhone },
    update: {
      plan,
      monthlyQuota: quota,
      subscriptionEnd,
    },
    create: {
      phoneNumber: cleanPhone,
      name: `User ${cleanPhone.slice(-4)}`,
      plan,
      monthlyQuota: quota,
      subscriptionEnd,
    },
  });

  return updatedUser;
}
