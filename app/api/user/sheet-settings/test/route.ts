import { NextResponse } from "next/server";
import { syncTransactionToGoogleSheet } from "@/lib/sheets";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { webhookUrl, phoneNumber, name } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, message: "Webhook URL is required for testing" },
        { status: 400 }
      );
    }

    const testTransaction = {
      id: `TEST-${Date.now().toString().slice(-4)}`,
      amount: 15000,
      description: "Tes Koneksi PingKas Auto-Sync",
      type: "EXPENSE" as const,
      date: new Date(),
      category: { name: "Pengujian Sistem" },
    };

    const testUser = {
      phoneNumber: phoneNumber || "628123456789",
      name: name || "Demo User",
      sheetWebhookUrl: webhookUrl.trim(),
      autoSyncSheet: true,
    };

    const result = await syncTransactionToGoogleSheet(testTransaction, testUser);

    if (result.synced) {
      return NextResponse.json(
        {
          success: true,
          message: "✅ Tes berhasil! 1 baris pengujian telah terkirim ke Google Spreadsheet Anda.",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengirim ke Google Spreadsheet: ${result.error || "Cek URL Webhook"}`,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("Test sheet sync error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal menguji koneksi Google Sheet",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
