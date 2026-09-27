import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: cleanPhone.replace(/^62/, "0") },
        ],
      },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        initialBalance: true,
        initialBankBalance: true,
        initialCashBalance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get initial balance error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get initial balance",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, userId, initialBalance, initialBankBalance, initialCashBalance } = body;

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
          ],
        },
      });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Parse balance values
    const newInitial =
      initialBalance !== undefined ? Math.max(0, parseFloat(String(initialBalance))) : undefined;
    const newBank =
      initialBankBalance !== undefined ? Math.max(0, parseFloat(String(initialBankBalance))) : undefined;
    const newCash =
      initialCashBalance !== undefined ? Math.max(0, parseFloat(String(initialCashBalance))) : undefined;

    // If initialBankBalance and initialCashBalance provided, auto calculate total initialBalance if not explicitly set
    let totalInitial = newInitial;
    if (totalInitial === undefined && (newBank !== undefined || newCash !== undefined)) {
      const bankVal = newBank ?? user.initialBankBalance ?? 0;
      const cashVal = newCash ?? user.initialCashBalance ?? 0;
      totalInitial = bankVal + cashVal;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(totalInitial !== undefined ? { initialBalance: totalInitial } : {}),
        ...(newBank !== undefined ? { initialBankBalance: newBank } : {}),
        ...(newCash !== undefined ? { initialCashBalance: newCash } : {}),
      },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        initialBalance: true,
        initialBankBalance: true,
        initialCashBalance: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Saldo awal berhasil disimpan!",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update initial balance error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update initial balance",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
