"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PingKasLogo } from "@/components/PingKasLogo";
import { WhatsAppSimulator } from "@/components/WhatsAppSimulator";
import {
  MessageCircle,
  Sparkles,
  Zap,
  PieChart,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  Layers,
  ChevronDown,
  ChevronUp,
  Users,
  Store,
  FileSpreadsheet,
  Wallet,
  CreditCard,
  Banknote,
  Undo2,
  ShieldCheck,
  Building2,
  Laptop,
  Check,
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Apakah bot PingKas bisa dimasukkan ke WhatsApp Group?",
      a: "Bisa banget! PingKas dirancang sangat cocok untuk UMKM, warung, toko, tim operasional, maupun keluarga. Cukup masukkan bot ke grup WhatsApp, dan setiap anggota terdaftar bisa mencatat transaksi dengan me-mention/tag bot (contoh: '@PingKas Beli stok kopi 100rb cash' atau '@PingKas Penjualan 300rb tf'). Bot hanya merespons dan mencatat data dari anggota terdaftar.",
    },
    {
      q: "Bagaimana cara kerja pencatatan metode pembayaran (Bank, Cash, E-Wallet)?",
      a: "Sistem AI PingKas otomatis mendeteksi kata kunci metode pembayaran dalam pesan Anda (misal 'tf', 'bca', 'mandiri' masuk ke Bank; 'cash', 'tunai' masuk ke Kas Fisik; 'qris', 'gopay' masuk ke E-Wallet). Jika tidak disebutkan, bot otomatis menetapkan metode sesuai jenis transaksi.",
    },
    {
      q: "Bagaimana integrasi Auto-Sync Google Spreadsheet bekerja?",
      a: "Pengguna cukup menyalin template Google Apps Script yang disediakan PingKas ke Spreadsheet miliknya, lalu memasang URL webhook via WhatsApp (!setsheet <URL>) atau Web Portal. Setiap transaksi baru otomatis masuk ke tab bulan berjalan (cth: tab 'September 2026') lengkap dengan kolom Pembayaran dan Waktu!",
    },
    {
      q: "Apakah saya bisa membatalkan / menghapus transaksi yang salah ketik?",
      a: "Sangat mudah! Cukup ketik 'batal', 'undo', atau '!hapus terakhir' di WhatsApp. Anda juga bisa mengetik '!riwayat' untuk melihat 5 transaksi terakhir beserta ID-nya dan menghapus nomor tertentu dengan '!hapus 1'.",
    },
    {
      q: "Bisakah saya mengatur saldo awal sebelum mulai mencatat?",
      a: "Ya! Anda bisa mengatur Saldo Awal Rekening Bank dan Saldo Awal Kas Tunai secara terpisah melalui WhatsApp (!setsaldo bank 2jt / !setsaldo cash 500k), Web Portal, maupun Aplikasi Mobile Flutter. Bot akan menghitung mutasi dan saldo akhir secara akurat.",
    },
    {
      q: "Apakah data saya tersinkronisasi di HP dan Laptop?",
      a: "Ya! Seluruh catatan transaksi langsung terhubung secara real-time di WhatsApp Bot, Aplikasi Mobile Flutter (Android/iOS), dan Web Portal Dashboard.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-pingkas-cream">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-28">
        {/* Glow ambient background circles */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-150 h-150 bg-linear-to-br from-orange-300/20 via-amber-200/10 to-teal-200/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -top-12 -left-20 w-96 h-96 bg-orange-400/10 rounded-full blur-2xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Top pill badge */}
              <div className="inline-flex items-center gap-2 bg-orange-100/90 border border-orange-200 px-4 py-1.5 rounded-full text-xs font-bold text-pingkas-orange-dark shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-pingkas-orange" />
                <span>Solusi Finansial Personal & UMKM via WhatsApp</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
                Catat Keuangan Secepat Kirim{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark">
                  Chat WhatsApp
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                Cukup ketik{" "}
                <span className="font-bold text-slate-900 bg-orange-100 px-2 py-0.5 rounded">
                  &ldquo;Kopi 25rb qris&rdquo;
                </span>{" "}
                atau{" "}
                <span className="font-bold text-slate-900 bg-teal-100 px-2 py-0.5 rounded">
                  &ldquo;Orderan catering 500k tf&rdquo;
                </span>
                . Transaksi otomatis terkategori, terpisah bank vs tunai, dan auto-sync ke Google Spreadsheet & Mobile App!
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="https://wa.me/6283878198815?text=Halo%20PingKas,%20saya%20mau%20catat%20keuangan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-4 text-base font-extrabold text-white bg-linear-to-r from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
                >
                  <MessageCircle className="w-5 h-5 fill-white" />
                  <span>Coba Chat di WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <Link
                  href="/portal"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 text-base font-bold text-slate-800 bg-white hover:bg-teal-50/50 hover:text-pingkas-teal hover:border-pingkas-teal border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <Smartphone className="w-5 h-5 text-pingkas-teal" />
                  <span>Buka Web Portal User</span>
                </Link>
              </div>

              {/* Trust & Stats Bar */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl font-black text-slate-900">0.5s</div>
                  <div className="text-xs font-semibold text-slate-500">
                    Respon Bot Instan
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-pingkas-teal">
                    100%
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Auto-Sync Sheets & App
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-pingkas-orange">
                    Bank/Cash
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Pisah Rekening & Kas
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Simulator */}
            <div className="lg:col-span-5" id="simulasi">
              <div className="relative">
                <div className="absolute -inset-1 bg-linear-to-r from-orange-400 to-teal-400 rounded-3xl blur-xl opacity-30 animate-pulse" />
                <WhatsAppSimulator />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UMKM & Group WhatsApp Showcase Section (NEW) */}
      <section className="py-20 bg-linear-to-b from-white to-orange-50/50 border-y border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Explanation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Fitur Unggulan UMKM & Bisnis</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                Bisa Di-Invite ke{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-600">
                  WhatsApp Group
                </span>{" "}
                Tim & Usaha Anda
              </h2>

              <p className="text-base text-slate-600 leading-relaxed">
                Punya toko, cafe, warung, atau bisnis bareng partner? Masukkan bot PingKas ke dalam WhatsApp Group tim. Setiap staf, kasir, atau rekan bisnis cukup me-mention bot untuk mencatat operasional harian.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Cukup Tag @PingKas di Grup</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Karyawan tinggal ketik: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 font-semibold">@PingKas Beli telur 2kg 55rb cash</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Aman & Terproteksi (Hanya Anggota Terdaftar)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bot hanya mencatat transaksi dari nomor yang sudah terdaftar, menjaga grup dari spam dan kebocoran data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Otomatis Terkumpul di 1 Rekap & Spreadsheet</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Semua transaksi dari semua tim langsung masuk ke buku kas digital dan Google Sheet per bulan secara rapi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Group Chat Mockup */}
            <div className="lg:col-span-6">
              <div className="bg-[#0b141a] text-white p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 font-sans">
                {/* WA Group Header */}
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="w-11 h-11 rounded-full bg-linear-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Kopi Senja - Operasional Toko</h4>
                    <p className="text-xs text-emerald-400 font-medium">Budi, Siska, Owner, PingKas Bot</p>
                  </div>
                </div>

                {/* Chat Bubbles */}
                <div className="space-y-3 text-xs leading-relaxed">
                  {/* User 1 message */}
                  <div className="bg-[#202c33] p-3 rounded-2xl rounded-tl-none max-w-[85%] border-l-2 border-emerald-400">
                    <p className="text-[11px] font-bold text-emerald-400">Budi (Kasir)</p>
                    <p className="text-slate-200">@PingKas Penjualan Shift Pagi 450.000 cash</p>
                    <span className="text-[10px] text-slate-400 block text-right">11:30</span>
                  </div>

                  {/* Bot reply */}
                  <div className="bg-[#005c4b] p-3 rounded-2xl rounded-tr-none ml-auto max-w-[90%] text-emerald-50 shadow-sm">
                    <p className="font-bold text-emerald-200">✅ TRANSAKSI DICATAT</p>
                    <p>👤 Pengguna: @Budi</p>
                    <p>📂 Kategori: Penjualan / Omset</p>
                    <p>💳 Metode: Tunai (Cash)</p>
                    <p>💰 Nominal: Rp 450.000 (Pemasukan +)</p>
                    <span className="text-[10px] text-emerald-200/80 block text-right">11:30</span>
                  </div>

                  {/* User 2 message */}
                  <div className="bg-[#202c33] p-3 rounded-2xl rounded-tl-none max-w-[85%] border-l-2 border-cyan-400">
                    <p className="text-[11px] font-bold text-cyan-400">Siska (Purchasing)</p>
                    <p className="text-slate-200">@PingKas Beli biji kopi arabika 150rb bca</p>
                    <span className="text-[10px] text-slate-400 block text-right">12:15</span>
                  </div>

                  {/* Bot reply */}
                  <div className="bg-[#005c4b] p-3 rounded-2xl rounded-tr-none ml-auto max-w-[90%] text-emerald-50 shadow-sm">
                    <p className="font-bold text-emerald-200">✅ TRANSAKSI DICATAT</p>
                    <p>👤 Pengguna: @Siska</p>
                    <p>📂 Kategori: Bahan Baku / Stok</p>
                    <p>💳 Metode: Bank / Transfer</p>
                    <p>💸 Nominal: Rp 150.000 (Pengeluaran -)</p>
                    <span className="text-[10px] text-emerald-200/80 block text-right">12:15</span>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">🚀 Terintegrasi langsung dengan Spreadsheet bulanan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Feature Matrix Showcase */}
      <section
        id="fitur"
        className="py-20 bg-white border-y border-orange-100/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-orange bg-orange-100/80 px-3.5 py-1.5 rounded-full">
              Fitur Lengkap Sesuai Kebutuhan Anda
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Semua yang Anda Butuhkan dalam 1 Ekosistem
            </h2>
            <p className="text-base text-slate-600">
              Mulai dari pencatatan instan via chat WhatsApp, multi-tab Spreadsheet, hingga dashboard analitik real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-orange-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-pingkas-orange-light to-pingkas-orange flex items-center justify-center text-white mb-6 shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Pencatatan Cepat Natural Teks
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tulis seperti chat biasa: &ldquo;Parkir 2000&rdquo;, &ldquo;Beli baju 150rb tf&rdquo;, atau &ldquo;+5jt Gaji&rdquo;. Bot otomatis mengenali angka, singkatan (k/rb/jt), dan maksud transaksi.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-teal-100 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-cyan-400 to-pingkas-teal flex items-center justify-center text-white mb-6 shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Klasifikasi Bank, Cash & E-Wallet
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pisahkan transaksi rekening bank, kas fisik/tunai, dan dompet digital (QRIS/Gopay). Pantau sisa saldo masing-masing rekening tanpa tertukar.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-emerald-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Auto-Sync Multi-Tab Google Sheets
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tiap transaksi otomatis masuk ke spreadsheet Anda secara real-time. Dikelompokkan rapi per tab bulanan (&quot;September 2026&quot;, dll) lengkap dengan kolom Pembayaran.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-amber-100 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white mb-6 shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Atur Saldo Awal (Initial Balance)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Masukkan saldo awal bank dan tunai kapan saja lewat perintah WA <code className="bg-amber-100 text-amber-900 px-1 rounded">!setsaldo bank 1jt</code> atau Web Portal untuk kalkulasi mutasi yang akurat.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-rose-100 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-rose-400 to-rose-600 flex items-center justify-center text-white mb-6 shadow-md shadow-rose-500/20 group-hover:scale-110 transition-transform">
                <Undo2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Hapus & Batalkan Transaksi di WA
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Salah catat? Cukup ketik <code className="bg-rose-100 text-rose-900 px-1 rounded">batal</code>, <code className="bg-rose-100 text-rose-900 px-1 rounded">!hapus 1</code>, atau lihat daftar dengan <code className="bg-rose-100 text-rose-900 px-1 rounded">!riwayat</code>. Saldo langsung disesuaikan kembali.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-indigo-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-indigo-400 to-indigo-600 flex items-center justify-center text-white mb-6 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <PieChart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                3 Platform Terhubung (WA, Mobile, Web)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Catat di WhatsApp, pantau grafiknya di Aplikasi Mobile Flutter, dan ekspor laporan keuangan format Excel/CSV di Web Portal kapan saja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Commands Cheatsheet Section */}
      <section className="py-20 bg-pingkas-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-teal bg-teal-100/80 px-3.5 py-1.5 rounded-full">
              Perintah Cepat WhatsApp
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Panduan Perintah WhatsApp Bot
            </h2>
            <p className="text-base text-slate-600">
              Ketik perintah singkat berikut di chat WhatsApp pribadi maupun grup untuk mengakses seluruh fitur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Command Box 1 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-pingkas-orange font-bold text-sm">
                <Zap className="w-4 h-4" />
                <span>Pencatatan Cepat</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 font-mono">
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">Makan siang 25rb</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Pengeluaran Tunai</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">Beli baju 150k bca</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Pengeluaran Bank</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">+5000000 Gaji</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Pemasukan Bank</span>
                </li>
              </ul>
            </div>

            {/* Command Box 2 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <Undo2 className="w-4 h-4" />
                <span>Hapus & Batalkan</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 font-mono">
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">batal / undo</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Hapus transaksi terakhir</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!riwayat</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Lihat 5 transaksi terakhir & ID</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!hapus 1</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Hapus urutan no 1 di riwayat</span>
                </li>
              </ul>
            </div>

            {/* Command Box 3 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Saldo Awal</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 font-mono">
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!setsaldo 1000000</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Set total saldo awal</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!setsaldo bank 750k</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Set saldo awal rekening bank</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!setsaldo cash 250k</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Set saldo awal kas tunai</span>
                </li>
              </ul>
            </div>

            {/* Command Box 4 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Spreadsheet & Rekap</span>
              </div>
              <ul className="text-xs space-y-2 text-slate-600 font-mono">
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">rekap</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Ringkasan saldo & kategori</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">!setsheet &lt;URL&gt;</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Pasang webhook Google Sheets</span>
                </li>
                <li className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <strong className="text-slate-900">rekap excel</strong>
                  <span className="block text-[11px] text-slate-400 font-sans">Unduh rekap file CSV / Excel</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="harga"
        className="py-20 bg-white border-y border-orange-100/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-orange bg-orange-100/80 px-3.5 py-1.5 rounded-full">
              Pilihan Paket Langganan
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Transparan & Terjangkau untuk Semua
            </h2>
            <p className="text-base text-slate-600">
              Mulai gratis sekarang atau upgrade ke PRO / UNLIMITED untuk kebutuhan usaha dan pencatatan yang tanpa batas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* FREE Plan */}
            <div className="bg-pingkas-cream rounded-3xl p-8 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">FREE</h3>
                  <span className="text-xs font-bold text-slate-500 bg-slate-200/80 px-2.5 py-1 rounded-full">
                    Starter
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">
                    Rp 0
                  </span>
                  <span className="text-sm text-slate-500"> / bulan</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Cocok untuk pengguna personal yang ingin mencoba kepraktisan bot WhatsApp.
                </p>

                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      <strong>20 Transaksi</strong> per bulan
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Catat via WhatsApp Bot & Grup</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Klasifikasi Bank & Cash</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Akses Web Portal & Mobile App</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/portal"
                className="w-full py-3.5 text-center font-bold text-sm text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Mulai Gratis Sekarang
              </Link>
            </div>

            {/* PRO Plan (Best Seller) */}
            <div className="bg-linear-to-b from-[#FFFDF9] to-[#FFF7ED] rounded-3xl p-8 border-2 border-pingkas-orange flex flex-col justify-between shadow-xl shadow-orange-500/10 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-pingkas-orange-light to-pingkas-orange text-white text-xs font-black px-4 py-1 rounded-full shadow-md">
                PALING POPULER ⭐
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">PRO</h3>
                  <span className="text-xs font-bold text-pingkas-orange-dark bg-orange-100 px-2.5 py-1 rounded-full">
                    Rekomendasi
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-pingkas-orange">
                    Rp 15.000
                  </span>
                  <span className="text-sm text-slate-500"> / 30 hari</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Ideal untuk pencatatan harian aktif keluarga & freelancer tanpa takut kehabisan kuota.
                </p>

                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>
                      <strong>200 Transaksi</strong> per bulan
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Auto-Sync Multi-Tab Google Sheets</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Atur Saldo Awal Bank & Tunai</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Unduh Rekap Laporan Excel/CSV</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Respon Bot Cepat Super Prioritas</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/6283878198815?text=Halo%20Admin,%20saya%20mau%20upgrade%20ke%20paket%20PRO"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 text-center font-bold text-sm text-white bg-linear-to-r from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
              >
                Upgrade ke PRO
              </a>
            </div>

            {/* UNLIMITED Plan */}
            <div className="bg-pingkas-cream rounded-3xl p-8 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    UNLIMITED
                  </h3>
                  <span className="text-xs font-bold text-pingkas-teal bg-teal-100 px-2.5 py-1 rounded-full">
                    UMKM & Toko 🚀
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">
                    Rp 29.000
                  </span>
                  <span className="text-sm text-slate-500"> / 30 hari</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Solusi lengkap untuk operasional UMKM, toko, warung makan, cafe, dan tim bisnis.
                </p>

                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      <strong>Transaksi Tanpa Batas (∞)</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Mendukung Banyak Anggota di WA Group</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Auto-Sync Real-time ke Google Spreadsheet</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Bebas Hapus & Batal Transaksi</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Dukungan CS 24/7 Prioritas</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/6283878198815?text=Halo%20Admin,%20saya%20mau%20upgrade%20ke%20paket%20UNLIMITED"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 text-center font-bold text-sm text-pingkas-teal bg-teal-50 border border-teal-200 hover:bg-teal-100 rounded-xl transition-colors"
              >
                Pilih UNLIMITED
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-pingkas-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-orange bg-orange-100/80 px-3.5 py-1.5 rounded-full">
              Pertanyaan Populer
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between font-bold text-slate-900 hover:text-pingkas-orange transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-pingkas-orange shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-linear-to-br from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto">
            <PingKasLogo size={80} showText={false} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Mulai Kelola Finansial Pribadi & Usahamu Sekarang!
          </h2>
          <p className="text-base sm:text-lg text-orange-100 max-w-2xl mx-auto">
            Gabung bersama ribuan pengguna dan pelaku UMKM yang telah beralih ke cara praktis mencatat keuangan via WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="https://wa.me/6283878198815?text=Halo%20PingKas"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-extrabold text-pingkas-orange-dark bg-white rounded-2xl shadow-xl hover:bg-orange-50 transition-all"
            >
              <MessageCircle className="w-5 h-5 fill-pingkas-orange-dark" />
              <span>Chat WhatsApp Sekarang</span>
            </a>
            <Link
              href="/portal"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-black/20 hover:bg-black/30 border border-white/30 rounded-2xl transition-all"
            >
              <span>Buka Web Portal</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
