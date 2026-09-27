import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, password } = body;

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor WhatsApp admin harus diisi.",
        },
        { status: 400 }
      );
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Password admin harus diisi.",
        },
        { status: 400 }
      );
    }

    const cleanPhone = phoneNumber.trim().replace(/\D/g, "");
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // 1. Verifikasi Password Admin
    if (password.trim() !== adminPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "❌ Password admin salah! Silakan coba lagi.",
        },
        { status: 401 }
      );
    }

    // 2. Cek apakah nomor ada di daftar ADMIN_NUMBERS di .env
    const adminEnv = process.env.ADMIN_NUMBERS || "085280357817,6285280357817";
    const adminList = adminEnv
      .split(",")
      .map((n) => n.trim().replace(/\D/g, ""))
      .filter(Boolean);

    const isEnvAdmin = adminList.some((adm) => {
      if (cleanPhone === adm) return true;
      if (adm.startsWith("0") && cleanPhone === "62" + adm.slice(1)) return true;
      if (cleanPhone.startsWith("0") && adm === "62" + cleanPhone.slice(1)) return true;
      return false;
    });

    // 3. Cari user di Database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: "62" + cleanPhone.replace(/^0/, "") },
          { phoneNumber: "0" + cleanPhone.replace(/^62/, "") },
        ],
      },
    });

    if (!user) {
      if (isEnvAdmin) {
        // Buat user admin baru jika terdaftar di ADMIN_NUMBERS
        user = await prisma.user.create({
          data: {
            phoneNumber: cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone,
            name: "Admin PingKas",
            isAdmin: true,
            plan: "UNLIMITED",
            monthlyQuota: 99999,
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "⛔ Nomor tidak terdaftar di sistem. Akses Admin ditolak.",
          },
          { status: 403 }
        );
      }
    }

    // Jika di .env adalah admin tapi di DB belum isAdmin, sinkronkan
    if (isEnvAdmin && !user.isAdmin) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    // 4. Pastikan memiliki role isAdmin
    if (!user.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: `⛔ Akses Ditolak: Nomor +${user.phoneNumber} tidak memiliki hak akses Admin.`,
        },
        { status: 403 }
      );
    }

    // 5. Generate session token
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        phoneNumber: user.phoneNumber,
        isAdmin: true,
        timestamp: Date.now(),
      })
    ).toString("base64");

    return NextResponse.json(
      {
        success: true,
        message: "Login Admin berhasil",
        data: {
          token: sessionToken,
          user: {
            id: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name || "Administrator",
            isAdmin: true,
            plan: user.plan,
            monthlyQuota: user.monthlyQuota,
            subscriptionEnd: user.subscriptionEnd,
            createdAt: user.createdAt,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server saat login admin.",
      },
      { status: 500 }
    );
  }
}
