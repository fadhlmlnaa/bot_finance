"use client";

import React, { useState, useEffect, useCallback } from "react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Activity,
  Users,
  Database,
  Server,
  MessageSquare,
  RefreshCw,
  Search,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Sliders,
  X,
} from "lucide-react";

interface HealthEngineData {
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  totalResponseTimeMs: number;
  timestamp: string;
  engines: {
    api: {
      name: string;
      status: string;
      environment: string;
      platform: string;
      nodeVersion?: string;
    };
    database: {
      name: string;
      status: string;
      latencyMs: number;
      provider: string;
      metrics?: {
        usersCount: number;
        transactionsCount: number;
        categoriesCount: number;
      };
      error?: string;
    };
    whatsapp: {
      name: string;
      status: string;
      latencyMs: number;
      connected: boolean;
      botNumber: string;
      workerUrl: string;
      uptime?: number;
      error?: string;
    };
  };
}

interface DashboardMetrics {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  unlimitedUsers: number;
  adminUsers: number;
  activePaidSubscriptions: number;
  totalTransactions: number;
  totalIncomeVolume: number;
  totalExpenseVolume: number;
}

interface UserAdminItem {
  id: string;
  phoneNumber: string;
  name: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO" | "UNLIMITED";
  monthlyQuota: number;
  subscriptionEnd: string | null;
  totalTransactionsCount: number;
  usage: {
    used: number;
    maxQuota: number;
    remaining: number;
    isAllowed: boolean;
    isUnlimited: boolean;
    expiresAt: string | null;
  };
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"HEALTH" | "USERS" | "METRICS">("HEALTH");


  // Health data
  const [healthData, setHealthData] = useState<HealthEngineData | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [autoRefreshHealth, setAutoRefreshHealth] = useState(false);

  // Metrics data
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  // Users data
  const [users, setUsers] = useState<UserAdminItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Edit User Modal state
  const [selectedUser, setSelectedUser] = useState<UserAdminItem | null>(null);
  const [editQuota, setEditQuota] = useState<number>(20);
  const [editPlan, setEditPlan] = useState<"FREE" | "PRO" | "UNLIMITED">("FREE");
  const [editDurationDays, setEditDurationDays] = useState<string>("30");
  const [editIsAdmin, setEditIsAdmin] = useState<boolean>(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [adminToast, setAdminToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Load health & users data
  const fetchHealth = useCallback(async () => {
    setIsRefreshingHealth(true);
    try {
      const res = await fetch("/api/admin/health");
      const json = await res.json();
      if (json.success) {
        setHealthData(json);
      }
    } catch (err) {
      console.error("Failed to fetch health:", err);
    } finally {
      setIsRefreshingHealth(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.success) {
        setMetrics(json.data.metrics);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/subscription");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const initAdmin = async () => {
      await Promise.all([fetchHealth(), fetchDashboardStats(), fetchUsers()]);
    };
    void initAdmin();
  }, [fetchHealth, fetchDashboardStats, fetchUsers]);

  // Auto refresh interval for health
  useEffect(() => {
    if (!autoRefreshHealth) return;
    const interval = setInterval(() => {
      void fetchHealth();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefreshHealth, fetchHealth]);


  const handleOpenEditModal = (u: UserAdminItem) => {
    setSelectedUser(u);
    setEditQuota(u.monthlyQuota);
    setEditPlan(u.plan);
    setEditIsAdmin(u.isAdmin);
    setEditDurationDays("30");
  };

  const handleSaveUserSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSavingUser(true);
    setAdminToast(null);

    try {
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          phoneNumber: selectedUser.phoneNumber,
          plan: editPlan,
          monthlyQuota: editQuota,
          durationDays: editPlan !== "FREE" ? parseInt(editDurationDays) : 0,
          isAdmin: editIsAdmin,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memperbarui pengguna");
      }

      setAdminToast({
        type: "success",
        text: `✅ Berhasil memperbarui user ${selectedUser.phoneNumber} (Paket: ${editPlan}, Kuota: ${editQuota})`,
      });

      setSelectedUser(null);
      await fetchUsers();
      await fetchDashboardStats();
    } catch (err: unknown) {
      setAdminToast({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal memperbarui",
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phoneNumber.includes(userSearch);
    const matchPlan =
      planFilter === "ALL"
        ? true
        : planFilter === "ADMIN"
        ? u.isAdmin
        : u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#FF9E40] shadow-inner">
              <ShieldCheck className="w-8 h-8 text-[#FF6D00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">Admin & Engine Center</h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-500/20 text-[#FF9E40] border border-orange-500/30">
                  DIREKTUR CONTROL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoring kondisi 3 Engine (API, Database Supabase, WhatsApp Bot) & Manajemen Kuota Pengguna.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchHealth();
                fetchDashboardStats();
                fetchUsers();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`}
              />
              <span>Refresh Semua</span>
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {adminToast && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${
              adminToast.type === "error"
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            <span>{adminToast.text}</span>
            <button
              onClick={() => setAdminToast(null)}
              className="p-1 hover:bg-black/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Pengguna
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {metrics?.totalUsers ?? users.length}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {metrics?.adminUsers ?? 1} Akun Admin
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6D00] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Langganan Aktif
              </span>
              <div className="text-2xl font-black text-[#1EA8B8] mt-1">
                {metrics?.activePaidSubscriptions ?? 0}
              </div>
              <span className="text-[11px] font-semibold text-teal-600">
                PRO & UNLIMITED Plan
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#1EA8B8] flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Transaksi
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {metrics?.totalTransactions ?? 0}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Tercatat di Supabase
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#FFA000] flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Sistem
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    healthData?.overallStatus === "HEALTHY"
                      ? "bg-emerald-500 animate-pulse"
                      : healthData?.overallStatus === "DEGRADED"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-lg font-black text-slate-900">
                  {healthData?.overallStatus || "HEALTHY"}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Ping: {healthData?.totalResponseTimeMs ?? 0}ms
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("HEALTH")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl transition-all ${
              activeTab === "HEALTH"
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Server className="w-4 h-4 text-[#FF9E40]" />
            <span>Kondisi Engine & Server</span>
          </button>

          <button
            onClick={() => setActiveTab("USERS")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-2xl transition-all ${
              activeTab === "USERS"
                ? "bg-[#FF6D00] text-white shadow-md shadow-orange-500/20"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kelola User & Kuota</span>
          </button>
        </div>

        {/* TAB 1: ENGINE HEALTH MONITOR */}
        {activeTab === "HEALTH" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#FF6D00]" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">Live Health Engine Status</h3>
                  <p className="text-xs text-slate-500">
                    Memantau kesehatan API Backend, Supabase PostgreSQL, dan Baileys WhatsApp Engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefreshHealth}
                    onChange={(e) => setAutoRefreshHealth(e.target.checked)}
                    className="rounded text-[#FF6D00] focus:ring-orange-500"
                  />
                  <span>Auto-Refresh (8s)</span>
                </label>

                <button
                  onClick={fetchHealth}
                  disabled={isRefreshingHealth}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshingHealth ? "animate-spin" : ""}`}
                  />
                  <span>Ping Engine</span>
                </button>
              </div>
            </div>

            {/* 3 Engine Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Engine 1: Next.js API */}
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                    <Server className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-base text-slate-900">Next.js API Engine</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Endpoint REST API & Serverless Handler
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Platform:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.api.platform || "Vercel / Node.js"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Environment:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.api.environment || "Production"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Node.js:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.api.nodeVersion || "v20.x"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engine 2: Supabase PostgreSQL */}
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#1EA8B8] flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full ${
                      healthData?.engines.database.status === "healthy"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-rose-100 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {healthData?.engines.database.status === "healthy" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> CONNECTED
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" /> ERROR
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    Supabase PostgreSQL DB
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Storage Data Transaksi, User & Kuota
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Latency Ping:</span>
                    <span className="font-bold text-emerald-600">
                      {healthData?.engines.database.latencyMs ?? 15} ms
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tabel Transaksi:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.database.metrics?.transactionsCount ?? 0} Baris
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tabel User:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.database.metrics?.usersCount ?? 0} Akun
                    </span>
                  </div>
                </div>
              </div>

              {/* Engine 3: Baileys WhatsApp Engine */}
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6D00] flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full ${
                      healthData?.engines.whatsapp.status === "healthy"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {healthData?.engines.whatsapp.status === "healthy" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> READY
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" /> STANDBY
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    WhatsApp Baileys Engine
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Background Worker Socket Parser
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Worker Host:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[140px]">
                      {healthData?.engines.whatsapp.workerUrl || "Render Worker"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Socket:</span>
                    <span className="font-bold text-slate-900">
                      {healthData?.engines.whatsapp.connected ? "Terhubung" : "Standby / QR Ready"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Bot WhatsApp:</span>
                    <span className="font-bold text-[#FF6D00]">
                      {healthData?.engines.whatsapp.botNumber || "Aktif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER & QUOTA MANAGEMENT */}
        {activeTab === "USERS" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Manajemen Kuota & Pengguna</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah kuota maksimal bulanan, paket subscription, dan role admin pengguna.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama atau No WA..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#FF6D00]"
                  />
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                  {["ALL", "FREE", "PRO", "UNLIMITED", "ADMIN"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlanFilter(p)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        planFilter === p
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Table */}
            {isLoadingUsers ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FF6D00]" />
                <span className="text-xs font-semibold">Memuat daftar pengguna...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-slate-200 rounded-2xl">
                Tidak ada pengguna yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-400">
                      <th className="pb-3 px-3">Pengguna</th>
                      <th className="pb-3 px-3">Paket</th>
                      <th className="pb-3 px-3">Kuota Bulanan</th>
                      <th className="pb-3 px-3">Penggunaan</th>
                      <th className="pb-3 px-3">Role</th>
                      <th className="pb-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const used = u.usage?.used || 0;
                      const max = u.usage?.isUnlimited ? "∞" : u.monthlyQuota;
                      const percentage = u.usage?.isUnlimited
                        ? 10
                        : Math.min(100, Math.round((used / u.monthlyQuota) * 100));

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-3">
                            <div className="font-extrabold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">+{u.phoneNumber}</div>
                          </td>

                          <td className="py-4 px-3">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                u.plan === "PRO"
                                  ? "bg-orange-100 text-[#E65100] border border-orange-200"
                                  : u.plan === "UNLIMITED"
                                  ? "bg-teal-100 text-[#1EA8B8] border border-teal-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {u.plan}
                            </span>
                          </td>

                          <td className="py-4 px-3">
                            <div className="font-bold text-slate-900">
                              {u.monthlyQuota} Transaksi/bln
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Total: {u.totalTransactionsCount} trx
                            </div>
                          </td>

                          <td className="py-4 px-3 min-w-[140px]">
                            <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                              <span>{used} / {max}</span>
                              <span className="text-slate-400">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percentage >= 100
                                    ? "bg-rose-500"
                                    : percentage > 80
                                    ? "bg-amber-500"
                                    : "bg-[#FF6D00]"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            {u.isAdmin ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <ShieldCheck className="w-3 h-3" /> Admin
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">User</span>
                            )}
                          </td>

                          <td className="py-4 px-3 text-right">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FF6D00] bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Kuota</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Edit User Quota & Subscription */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF6D00] flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Edit Kuota: {selectedUser.name}
                    </h3>
                    <p className="text-xs text-slate-500">+{selectedUser.phoneNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUserSubscription} className="space-y-4">
                {/* Plan Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Paket Langganan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["FREE", "PRO", "UNLIMITED"] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => {
                          setEditPlan(p);
                          if (p === "FREE") setEditQuota(20);
                          else if (p === "PRO") setEditQuota(200);
                          else if (p === "UNLIMITED") setEditQuota(99999);
                        }}
                        className={`py-2.5 text-xs font-black rounded-xl border transition-all ${
                          editPlan === p
                            ? "bg-orange-50 border-[#FF6D00] text-[#FF6D00] shadow-xs"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Quota (Max Trx) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Maksimal Kuota Transaksi Bulanan
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editQuota}
                    onChange={(e) => setEditQuota(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 text-base font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[20, 100, 200, 500, 1000, 99999].map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => setEditQuota(q)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 text-slate-700 rounded-lg border border-slate-200"
                      >
                        {q === 99999 ? "∞ Max" : `${q}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration if Paid */}
                {editPlan !== "FREE" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tambah Masa Aktif (Hari)
                    </label>
                    <select
                      value={editDurationDays}
                      onChange={(e) => setEditDurationDays(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00]"
                    >
                      <option value="30">+30 Hari (1 Bulan)</option>
                      <option value="90">+90 Hari (3 Bulan)</option>
                      <option value="180">+180 Hari (6 Bulan)</option>
                      <option value="365">+365 Hari (1 Tahun)</option>
                    </select>
                  </div>
                )}

                {/* Admin Flag */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsAdmin}
                      onChange={(e) => setEditIsAdmin(e.target.checked)}
                      className="rounded text-[#FF6D00] focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Berikan Hak Akses Admin (isAdmin = true)</span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUser}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF9E40] via-[#FF6D00] to-[#E65100] rounded-xl shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSavingUser ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Simpan Perubahan</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
