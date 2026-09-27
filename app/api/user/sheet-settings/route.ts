import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from "@/lib/sheets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: "Query parameter 'phoneNumber' is required" },
        { status: 400 }
      );
    }

    let cleanPhone = phoneNumber.trim().replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        sheetWebhookUrl: true,
        autoSyncSheet: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...user,
          scriptTemplate: GOOGLE_APPS_SCRIPT_TEMPLATE,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Fetch sheet settings error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sheet settings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, userId, sheetWebhookUrl, autoSyncSheet } = body;

    if (!phoneNumber && !userId) {
      return NextResponse.json(
        { success: false, message: "phoneNumber or userId is required" },
        { status: 400 }
      );
    }

    let cleanPhone = "";
    if (phoneNumber) {
      cleanPhone = String(phoneNumber).trim().replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);
    }

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    
    if (!user && cleanPhone) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: cleanPhone },
            { phoneNumber: cleanPhone.replace(/^62/, "0") },
            { phoneNumber: cleanPhone.replace(/^0/, "62") },
          ],
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: `User dengan nomor ${phoneNumber} tidak ditemukan di database` },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        sheetWebhookUrl:
          sheetWebhookUrl !== undefined
            ? sheetWebhookUrl && String(sheetWebhookUrl).trim().length > 0
              ? String(sheetWebhookUrl).trim()
              : null
            : undefined,
        autoSyncSheet:
          autoSyncSheet !== undefined ? Boolean(autoSyncSheet) : undefined,
      },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        sheetWebhookUrl: true,
        autoSyncSheet: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pengaturan Google Sheets berhasil disimpan!",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update sheet settings error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update sheet settings",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
