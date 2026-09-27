import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();

  // 1. Check API Engine (Next.js / Vercel)
  const apiEngine = {
    name: "Next.js API Engine",
    status: "healthy",
    environment: process.env.NODE_ENV || "production",
    platform: process.env.VERCEL ? "Vercel Serverless" : "Node.js Server",
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  // 2. Check Database Engine (PostgreSQL / Supabase)
  let dbEngine: {
    name: string;
    status: "healthy" | "unhealthy";
    latencyMs: number;
    provider: string;
    metrics?: {
      usersCount: number;
      transactionsCount: number;
      categoriesCount: number;
    };
    error?: string;
  } = {
    name: "PostgreSQL Database Engine (Supabase)",
    status: "unhealthy",
    latencyMs: 0,
    provider: "PostgreSQL",
  };

  const dbStartTime = Date.now();
  try {
    // Quick ping query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStartTime;

    const [usersCount, transactionsCount, categoriesCount] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.category.count(),
    ]);

    dbEngine = {
      name: "PostgreSQL Database Engine (Supabase)",
      status: "healthy",
      latencyMs: dbLatency,
      provider: "PostgreSQL Pooler",
      metrics: {
        usersCount,
        transactionsCount,
        categoriesCount,
      },
    };
  } catch (error: unknown) {
    dbEngine.latencyMs = Date.now() - dbStartTime;
    dbEngine.error = error instanceof Error ? error.message : "Database connection failed";
  }

  // 3. Check WhatsApp Bot Engine (Baileys Worker on Render)
  const waBotUrl =
    process.env.WA_BOT_URL ||
    process.env.NEXT_PUBLIC_WA_BOT_URL ||
    "http://localhost:3001";

  let waEngine: {
    name: string;
    status: "healthy" | "unhealthy" | "unreachable";
    latencyMs: number;
    connected: boolean;
    botNumber: string;
    workerUrl: string;
    uptime?: number;
    error?: string;
  } = {
    name: "WhatsApp Bot Engine (Baileys Worker)",
    status: "unreachable",
    latencyMs: 0,
    connected: false,
    botNumber: "Unknown",
    workerUrl: waBotUrl,
  };

  const waStartTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const waRes = await fetch(`${waBotUrl}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    const waLatency = Date.now() - waStartTime;

    if (waRes.ok) {
      const waData = await waRes.json();
      waEngine = {
        name: "WhatsApp Bot Engine (Baileys Worker)",
        status: waData.connected ? "healthy" : "unhealthy",
        latencyMs: waLatency,
        connected: Boolean(waData.connected),
        botNumber: waData.botNumber || "Not connected",
        workerUrl: waBotUrl,
        uptime: waData.uptime,
      };
    } else {
      waEngine.latencyMs = waLatency;
      waEngine.error = `HTTP Error ${waRes.status}`;
    }
  } catch (error: unknown) {
    waEngine.latencyMs = Date.now() - waStartTime;
    waEngine.error =
      error instanceof Error ? error.message : "Worker unreachable / offline";
  }

  // Overall Status
  let overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
  if (dbEngine.status !== "healthy") {
    overallStatus = "CRITICAL";
  } else if (waEngine.status !== "healthy") {
    overallStatus = "DEGRADED"; // API & DB work, but WA bot is offline
  }

  const totalResponseTimeMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      overallStatus,
      totalResponseTimeMs,
      timestamp: new Date().toISOString(),
      engines: {
        api: apiEngine,
        database: dbEngine,
        whatsapp: waEngine,
      },
    },
    { status: 200 }
  );
}
