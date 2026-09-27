import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSpreadsheetCsv } from "@/lib/sheets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const month = searchParams.get("month"); // 1-12
    const year = searchParams.get("year"); // e.g. 2026
    const type = searchParams.get("type") as "INCOME" | "EXPENSE" | null;

    const whereClause: Record<string, unknown> = {};

    let userTitle = "Rekap Transaksi PingKas";

    if (phoneNumber) {
      const cleanPhone = phoneNumber.trim().replace(/\D/g, "");
      const finalPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
      whereClause.user = { phoneNumber: finalPhone };
      userTitle = `Rekap Transaksi PingKas (+${finalPhone})`;
    }

    if (type && (type === "INCOME" || type === "EXPENSE")) {
      whereClause.type = type;
    }

    if (year) {
      const y = parseInt(year);
      let startDate: Date;
      let endDate: Date;

      if (month) {
        const m = parseInt(month) - 1;
        startDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
        userTitle += ` - Bulan ${month}/${year}`;
      } else {
        startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
        userTitle += ` - Tahun ${year}`;
      }

      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        user: {
          select: { phoneNumber: true, name: true },
        },
        category: {
          select: { name: true },
        },
      },
    });

    const csvContent = generateSpreadsheetCsv(transactions, userTitle);

    const filename = `rekap-pingkas-${phoneNumber || "global"}-${Date.now()}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to export spreadsheet",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
