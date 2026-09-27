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
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Bagaimana cara kerja PingKas di WhatsApp?",
      a: "Cukup simpan nomor WhatsApp PingKas dan kirimkan pesan pengeluaran seperti 'Kopi Kenangan 28rb' atau 'Bensin 50000'. Sistem otomatis mendeteksi nominal, tipe transaksi (pemasukan/pengeluaran), dan kategorinya!",
    },
    {
      q: "Apakah saya bisa melihat transaksi saya di Web dan Aplikasi Mobile?",
      a: "Ya! Semua transaksi yang dicatat via WhatsApp langsung tersinkronisasi ke Web Portal User dan Aplikasi Mobile Flutter PingKas secara real-time.",
    },
    {
      q: "Apa yang terjadi jika kuota bulanan saya habis?",
      a: "Untuk paket FREE (20 transaksi/bulan), bot akan memberi tahu bahwa kuota telah tercapai. Anda dapat meng-upgrade ke paket PRO (200 transaksi/bulan) atau UNLIMITED untuk terus mencatat.",
    },
    {
      q: "Apakah data keuangan saya aman?",
      a: "Tentu! Seluruh data transaksi disimpan aman dalam database PostgreSQL Supabase dengan enkripsi standar industri dan akses terproteksi.",
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
              <div className="inline-flex items-center gap-2 bg-orange-100/80 border border-orange-200/80 px-4 py-1.5 rounded-full text-xs font-bold text-pingkas-orange-dark shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-pingkas-orange animate-spin" />
                <span>Asisten Keuangan Cepat via WhatsApp & Mobile</span>
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
                  &ldquo;Kopi 25rb&rdquo;
                </span>{" "}
                atau{" "}
                <span className="font-bold text-slate-900 bg-teal-100 px-2 py-0.5 rounded">
                  &ldquo;Gaji 5jt&rdquo;
                </span>
                . Transaksi langsung tercatat, terkategori otomatis, dan siap
                dipantau di Web & Mobile App.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="https://wa.me/6281234567890?text=Halo%20PingKas,%20saya%20mau%20catat%20keuangan"
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
                    Respon Bot AI
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-pingkas-teal">
                    100%
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Auto Sync Real-time
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-pingkas-orange">
                    20+
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Kategori Otomatis
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

      {/* Features Showcase Section */}
      <section
        id="fitur"
        className="py-20 bg-white border-y border-orange-100/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-orange bg-orange-100/80 px-3.5 py-1.5 rounded-full">
              Keunggulan PingKas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Solusi Catat Keuangan Paling Santai & Cepat
            </h2>
            <p className="text-base text-slate-600">
              Didesain khusus untuk kamu yang malas membuka aplikasi keuangan
              yang rumit dan penuh form panjang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-orange-100 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-pingkas-orange-light to-pingkas-orange flex items-center justify-center text-white mb-6 shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Ketik Seperti Chat Biasa
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tulis saja pengeluaran harianmu: &ldquo;Sate Padang 30rb&rdquo;,
                &ldquo;Gojek 18k&rdquo;, atau &ldquo;Gaji Bulanan 7jt&rdquo;.
                PingKas memahami teks naturalmu.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-teal-100 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-cyan-400 to-pingkas-teal flex items-center justify-center text-white mb-6 shadow-md shadow-teal-500/20 group-hover:scale-110 transition-transform">
                <PieChart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Smart AI Categorizer
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Kategori Makanan, Transportasi, Tagihan, Belanja, dan Hiburan
                langsung terpasang otomatis tanpa perlu dipilih manual.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-pingkas-cream p-8 rounded-3xl border border-amber-100 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-amber-200 via-pingkas-gold to-pingkas-gold-dark flex items-center justify-center text-slate-900 mb-6 shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Sync Web & Mobile App
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pantau riwayat lengkap, tambah transaksi lewat form web, dan
                lihat status kuota kapan saja melalui Web Portal atau Flutter
                App.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Step Workflow */}
      <section className="py-20 bg-pingkas-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-pingkas-teal bg-teal-100/80 px-3.5 py-1.5 rounded-full">
              Cara Kerja
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Hanya 3 Langkah Mudah
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm relative">
              <span className="text-5xl font-black text-orange-200/70 absolute top-4 right-6">
                01
              </span>
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-pingkas-orange font-black text-lg flex items-center justify-center mb-6">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Kirim Chat ke WA
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ketik pengeluaran atau pemasukan baru langsung ke kontak
                WhatsApp Bot PingKas.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm relative">
              <span className="text-5xl font-black text-teal-200/70 absolute top-4 right-6">
                02
              </span>
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-pingkas-teal font-black text-lg flex items-center justify-center mb-6">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Bot Memproses Otomatis
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bot AI membaca nominal, menetapkan kategori, dan menyimpan data
                ke database dalam 0.5 detik.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm relative">
              <span className="text-5xl font-black text-amber-200/70 absolute top-4 right-6">
                03
              </span>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-pingkas-gold-dark font-black text-lg flex items-center justify-center mb-6">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">
                Pantau di Web & Mobile
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Buka Web Portal untuk menambah transaksi secara manual, cek sisa
                kuota, dan ekspor laporan.
              </p>
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
              Transparan Tanpa Biaya Tersembunyi
            </h2>
            <p className="text-base text-slate-600">
              Mulai gratis sekarang atau upgrade ke PRO untuk kebutuhan
              pencatatan harian yang lebih leluasa.
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
                  Cocok untuk pengguna baru yang ingin mencoba kepraktisan bot
                  WhatsApp.
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
                    <span>Catat via WhatsApp Bot</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Akses Web Portal User</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Sinkronisasi Mobile App</span>
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
                PALING POPULER
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
                  <span className="text-sm text-slate-500"> / bulan</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Ideal untuk pencatatan harian aktif tanpa takut kehabisan
                  kuota transaksi.
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
                    <span>Smart AI Categorizer Prioritas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Laporan & Export Rekap Keuangan</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-pingkas-orange shrink-0" />
                    <span>Respon Bot Cepat Super Prioritas</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20upgrade%20ke%20paket%20PRO"
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
                    Bisnis / Power User
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">
                    Rp 29.000
                  </span>
                  <span className="text-sm text-slate-500"> / bulan</span>
                </div>
                <p className="text-xs text-slate-600 mb-6">
                  Untuk pebisnis, UMKM, atau individu dengan mobilitas transaksi
                  super tinggi.
                </p>

                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      <strong>Transaksi Tanpa Batas (Unlimited)</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Kustomisasi Kategori Sepuasnya</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Akses API & Webhook Eksklusif</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Dukungan CS 24/7 Prioritas</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20upgrade%20ke%20paket%20UNLIMITED"
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
            Mulai Kelola Finansialmu Lebih Sehat Sekarang!
          </h2>
          <p className="text-base sm:text-lg text-orange-100 max-w-2xl mx-auto">
            Gabung bersama ribuan pengguna yang telah beralih ke cara cerdas
            mencatat keuangan via WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="https://wa.me/6281234567890?text=Halo%20PingKas"
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
