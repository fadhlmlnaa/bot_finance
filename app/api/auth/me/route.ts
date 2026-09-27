import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUserQuota } from "@/lib/subscription";

function extractUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const raw = authHeader.replace("Bearer ", "").trim();
    const json = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    return json.userId || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const authHeader = request.headers.get("authorization");
    const tokenUserId = extractUserIdFromToken(authHeader);

    let user = null;

    if (tokenUserId) {
      user = await prisma.user.findUnique({ where: { id: tokenUserId } });
    } else if (phoneNumber) {
      let clean = phoneNumber.trim().replace(/\D/g, "");
      if (clean.startsWith("0")) clean = "62" + clean.slice(1);
      user = await prisma.user.findUnique({ where: { phoneNumber: clean } });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found or unauthenticated" },
        { status: 404 }
      );
    }

    const quota = await checkUserQuota(user);

    return NextResponse.json(
      {
        success: true,
        data: {
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
    console.error("Auth profile error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
