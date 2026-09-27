import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserQuota } from "@/lib/subscription";

/**
 * Normalizes Indonesian phone numbers (e.g. 0812 -> 62812)
 */
function normalizePhoneNumber(phone: string): string {
  let clean = phone.trim().replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  return clean;
}

/**
 * Checks if a phone number is registered as an Admin in ADMIN_NUMBERS (.env)
 */
function checkIsAdmin(phone: string): boolean {
  const adminEnv = process.env.ADMIN_NUMBERS || "";
  const adminList = adminEnv
    .split(",")
    .map((n) => normalizePhoneNumber(n))
    .filter(Boolean);

  return adminList.includes(phone);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, name } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Field 'phoneNumber' is required.",
        },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhoneNumber(phoneNumber);
    const shouldBeAdmin = checkIsAdmin(cleanPhone);

    // Upsert user
    let user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber: cleanPhone,
          name: name?.trim() || `User ${cleanPhone.slice(-4)}`,
          isAdmin: shouldBeAdmin,
        },
      });
    } else {
      // Update name if provided or update admin status if configured in .env
      const updateData: Record<string, unknown> = {};
      if (name && name.trim()) {
        updateData.name = name.trim();
      }
      if (shouldBeAdmin && !user.isAdmin) {
        updateData.isAdmin = true;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    // Get current quota and subscription status
    const quota = await checkUserQuota(user);

    // Generate a simple auth session token for Flutter
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        isAdmin: user.isAdmin,
        timestamp: Date.now(),
      })
    ).toString("base64");

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          token: sessionToken,
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            isAdmin: user.isAdmin,
            plan: user.plan,
            monthlyQuota: user.monthlyQuota,
            subscriptionEnd: user.subscriptionEnd,
            initialBalance: user.initialBalance,
            initialBankBalance: user.initialBankBalance,
            initialCashBalance: user.initialCashBalance,
            sheetWebhookUrl: user.sheetWebhookUrl,
            autoSyncSheet: user.autoSyncSheet,
            createdAt: user.createdAt,
          },
          quota: {
            used: quota.used,
            maxQuota: quota.maxQuota,
            remaining: quota.remaining,
            isAllowed: quota.isAllowed,
            isUnlimited: quota.isUnlimited,
            expiresAt: quota.expiresAt,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Auth login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to authenticate",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
