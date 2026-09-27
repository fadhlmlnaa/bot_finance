"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PingKasLogo } from "@/components/PingKasLogo";
import {
  PlusCircle,
  Wallet,
  Search,
  RefreshCw,
  LogOut,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
} from "lucide-react";
import { inferCategoryName } from "@/lib/categorizer";

interface UserProfile {
  id: string;
  phoneNumber: string;
  name: string;
  isAdmin: boolean;
  plan: string;
  monthlyQuota: number;
  subscriptionEnd: string | null;
}

interface QuotaInfo {
  used: number;
  maxQuota: number;
  remaining: number;
  isAllowed: boolean;
  isUnlimited: boolean;
  expiresAt: string | null;
}

interface TransactionItem {
  id: string;
  amount: number;
  description: string;
  type: "EXPENSE" | "INCOME";
  date: string;
  category?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export default function UserPortalPage() {
  // Auth state
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  // Data state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // New Transaction Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trxAmount, setTrxAmount] = useState("");
  const [trxDescription, setTrxDescription] = useState("");
  const [trxType, setTrxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [trxCategory, setTrxCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchTransactions = useCallback(async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/transactions?phoneNumber=${encodeURIComponent(phoneNumber)}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  const fetchUserData = useCallback(async (phoneNumber: string) => {
    setIsLoadingData(true);
    try {
      // Refresh user login/quota info
      const resLogin = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const dataLogin = await resLogin.json();
      if (dataLogin.success) {
        setCurrentUser(dataLogin.data.user);
        setQuota(dataLogin.data.quota);
      }

      await fetchTransactions(phoneNumber);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, [fetchTransactions]);

  // Load existing session from localStorage on mount
  useEffect(() => {
    const initSession = async () => {
      const savedUser = localStorage.getItem("pingkas_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.phoneNumber) {
            await fetchUserData(parsed.phoneNumber);
          }
        } catch {
          localStorage.removeItem("pingkas_user");
        }
      }
    };
    void initSession();
  }, [fetchUserData]);

  const handleDescriptionChange = (text: string) => {
    setTrxDescription(text);
    if (text.trim() && !trxCategory) {
      const suggested = inferCategoryName(text, trxType);
      if (suggested && suggested !== "Pengeluaran Lainnya" && suggested !== "Pemasukan Lainnya") {
        setTrxCategory(suggested);
      }
    }
  };


  const handleLogin = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const phone = customPhone || phoneInput;
    if (!phone.trim()) return;

    setIsLoggingIn(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          name: nameInput.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal masuk");
      }

      const userData: UserProfile = json.data.user;
      const quotaData: QuotaInfo = json.data.quota;

      setCurrentUser(userData);
      setQuota(quotaData);
      localStorage.setItem("pingkas_user", JSON.stringify(userData));

      await fetchTransactions(userData.phoneNumber);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pingkas_user");
    setCurrentUser(null);
    setQuota(null);
    setTransactions([]);
  };


  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const rawNum = trxAmount.replace(/\D/g, "");
    const amountVal = parseFloat(rawNum);

    if (!amountVal || amountVal <= 0) {
      setFeedbackMsg({ type: "error", text: "Nominal transaksi tidak valid!" });
      return;
    }

    if (!trxDescription.trim()) {
      setFeedbackMsg({ type: "error", text: "Deskripsi transaksi harus diisi!" });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          phoneNumber: currentUser.phoneNumber,
          amount: amountVal,
          description: trxDescription.trim(),
          type: trxType,
          categoryName: trxCategory.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mencatat transaksi");
      }

      setFeedbackMsg({
        type: "success",
        text: `✅ Berhasil mencatat ${trxType === "INCOME" ? "Pemasukan" : "Pengeluaran"} Rp ${amountVal.toLocaleString(
          "id-ID"
        )}!`,
      });

      // Reset form
      setTrxAmount("");
      setTrxDescription("");
      setTrxCategory("");
      setIsModalOpen(false);

      // Refresh data & quota
      await fetchUserData(currentUser.phoneNumber);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal mencatat transaksi",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchType = filterType === "ALL" || t.type === filterType;
    const matchSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* If NOT logged in: Show Login Screen */}
        {!currentUser ? (
          <div className="max-w-md mx-auto my-8 bg-white p-8 rounded-3xl border border-orange-100 shadow-xl shadow-orange-500/5">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-3">
                <PingKasLogo size={64} showText={false} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Portal Transaksi PingKas
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Masuk dengan nomor WhatsApp untuk cek kuota dan tambah transaksi.
              </p>
            </div>

            {feedbackMsg && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                  feedbackMsg.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Contoh: 081234567890 atau 62812..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Panggilan (Opsional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Contoh: Budi Pratama"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 text-sm font-extrabold text-white bg-gradient-to-r from-[#FF9E40] via-[#FF6D00] to-[#E65100] rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Masuk ke Web Portal</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Logged In User Dashboard */
          <div className="space-y-8">
            {/* Header Profile & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6D00] font-black text-xl shadow-inner">
                  <PingKasLogo size={42} showText={false} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-900">{currentUser.name}</h1>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        currentUser.plan === "PRO"
                          ? "bg-orange-100 text-[#E65100] border border-orange-200"
                          : currentUser.plan === "UNLIMITED"
                          ? "bg-teal-100 text-[#1EA8B8] border border-teal-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {currentUser.plan}
                    </span>
                    {currentUser.isAdmin && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    WhatsApp: +{currentUser.phoneNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-[#FF9E40] via-[#FF6D00] to-[#E65100] rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Transaksi</span>
                </button>

                <button
                  onClick={() => fetchUserData(currentUser.phoneNumber)}
                  disabled={isLoadingData}
                  className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Segarkan Data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quota Usage Bar & Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Quota Card */}
              <div className="bg-gradient-to-br from-[#FFFDF9] to-[#FFF7ED] p-6 rounded-3xl border-2 border-orange-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-[#E65100] uppercase tracking-wider">
                      Kuota Transaksi Bulan Ini
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Paket {currentUser.plan}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-slate-900">
                      {quota?.used ?? 0}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      / {quota?.isUnlimited ? "∞ Unlimited" : `${quota?.maxQuota ?? 20} Trx`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {!quota?.isUnlimited && (
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (quota?.used || 0) >= (quota?.maxQuota || 20)
                            ? "bg-rose-500"
                            : (quota?.used || 0) > (quota?.maxQuota || 20) * 0.8
                            ? "bg-amber-500"
                            : "bg-[#FF6D00]"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            ((quota?.used || 0) / (quota?.maxQuota || 20)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-600 font-medium">
                    {quota?.isUnlimited
                      ? "Bebas mencatat transaksi tanpa batasan kuota!"
                      : `Sisa kuota: ${quota?.remaining ?? 0} transaksi lagi`}
                  </p>
                </div>

                {currentUser.plan === "FREE" && (
                  <a
                    href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20upgrade%20ke%20paket%20PRO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block text-center text-xs font-extrabold text-[#FF6D00] bg-white border border-orange-300 py-2 rounded-xl hover:bg-orange-50 transition-colors"
                  >
                    ⭐ Upgrade ke Paket PRO (200 Trx)
                  </a>
                )}
              </div>

              {/* Saldo Bersih Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Saldo Bersih (Net)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#1EA8B8] flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-black ${
                      netBalance >= 0 ? "text-[#1EA8B8]" : "text-rose-600"
                    }`}
                  >
                    Rp {netBalance.toLocaleString("id-ID")}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Pemasukan dikurangi Pengeluaran
                  </p>
                </div>
              </div>

              {/* Total Pemasukan Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">
                    Total Pemasukan
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">
                    +Rp {totalIncome.toLocaleString("id-ID")}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Dari {transactions.filter((t) => t.type === "INCOME").length} transaksi masuk
                  </p>
                </div>
              </div>

              {/* Total Pengeluaran Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[#E65100] uppercase tracking-wider">
                    Total Pengeluaran
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6D00] flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#FF6D00]">
                    -Rp {totalExpense.toLocaleString("id-ID")}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Dari {transactions.filter((t) => t.type === "EXPENSE").length} transaksi keluar
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Riwayat & Pemantauan Transaksi</h3>
                  <p className="text-xs text-slate-500">
                    Total {filteredTransactions.length} transaksi ditampilkan
                  </p>
                </div>

                {/* Filter Tabs & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari transaksi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#FF6D00]"
                    />
                  </div>

                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setFilterType("ALL")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        filterType === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setFilterType("EXPENSE")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        filterType === "EXPENSE"
                          ? "bg-[#FF6D00] text-white shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Pengeluaran
                    </button>
                    <button
                      onClick={() => setFilterType("INCOME")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        filterType === "INCOME"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600"
                      }`}
                    >
                      Pemasukan
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              {isLoadingData ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FF6D00]" />
                  <span className="text-xs font-semibold">Memuat transaksi...</span>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Belum ada transaksi</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mulai dengan klik tombol &ldquo;Tambah Transaksi&rdquo; atau kirim pesan di WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map((trx) => {
                    const isExpense = trx.type === "EXPENSE";
                    const formattedDate = new Date(trx.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={trx.id}
                        className="py-4 flex items-center justify-between hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isExpense
                                ? "bg-orange-50 text-[#FF6D00]"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {isExpense ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {trx.description}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span>{formattedDate}</span>
                              <span>•</span>
                              <span className="font-semibold text-[#1EA8B8] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                                {trx.category?.name || "Umum"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`font-black text-sm sm:text-base ${
                            isExpense ? "text-[#FF6D00]" : "text-emerald-600"
                          }`}
                        >
                          {isExpense ? "-" : "+"}Rp {trx.amount.toLocaleString("id-ID")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Tambah Transaksi */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF6D00] flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Transaksi Baru</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mb-4 ${
                    feedbackMsg.type === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {feedbackMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateTransaction} className="space-y-4">
                {/* Type toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis Transaksi
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTrxType("EXPENSE")}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                        trxType === "EXPENSE"
                          ? "bg-[#FF6D00] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrxType("INCOME")}
                      className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                        trxType === "INCOME"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pemasukan
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 25000"
                    value={trxAmount}
                    onChange={(e) => setTrxAmount(e.target.value)}
                    className="w-full px-4 py-3 text-lg font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                  />
                  {/* Quick Chips */}
                  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                    {[10000, 20000, 50000, 100000].map((quick) => (
                      <button
                        type="button"
                        key={quick}
                        onClick={() => setTrxAmount(quick.toString())}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-orange-50 hover:text-[#FF6D00] text-slate-700 rounded-lg border border-slate-200"
                      >
                        +{quick.toLocaleString("id-ID")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deskripsi / Catatan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Makan Siang Nasi Padang, Bensin, Gaji"
                    value={trxDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kategori (AI Auto-detect)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Makanan & Minuman, Transportasi, Tagihan"
                    value={trxCategory}
                    onChange={(e) => setTrxCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6D00] focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#FF9E40] via-[#FF6D00] to-[#E65100] rounded-xl shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Simpan Transaksi</span>
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
