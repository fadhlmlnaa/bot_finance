"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PingKasLogo } from "./PingKasLogo";
import {
  MessageCircle,
  LayoutDashboard,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";



export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-pingkas-cream/90 backdrop-blur-md border-b border-orange-100/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <PingKasLogo size={46} showText={true} horizontal={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/#fitur"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pingkas-orange rounded-lg transition-colors"
            >
              Fitur Utama
            </Link>
            <Link
              href="/#simulasi"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pingkas-orange rounded-lg transition-colors"
            >
              Simulasi Chat
            </Link>
            <Link
              href="/#harga"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pingkas-orange rounded-lg transition-colors"
            >
              Harga & Kuota
            </Link>
            <Link
              href="/#faq"
              className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-pingkas-orange rounded-lg transition-colors"
            >
              FAQ
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/portal"
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
                pathname === "/portal"
                  ? "bg-pingkas-teal text-white shadow-teal-500/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-pingkas-teal hover:text-pingkas-teal"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-pingkas-teal" />
              Portal User
            </Link>

            <a
              href="https://wa.me/6281234567890?text=Halo%20PingKas,%20saya%20mau%20catat%20keuangan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-linear-to-r from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark rounded-xl shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Coba WhatsApp Bot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/portal"
              className="p-2 text-xs font-bold text-pingkas-teal bg-teal-50 rounded-lg border border-teal-100"
            >
              Portal
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-slate-700 hover:text-pingkas-orange bg-white rounded-xl border border-slate-200"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF9] border-b border-orange-100 px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            <Link
              href="/#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-slate-700 hover:text-pingkas-orange hover:bg-orange-50 rounded-lg"
            >
              Fitur Utama
            </Link>
            <Link
              href="/#simulasi"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-slate-700 hover:text-pingkas-orange hover:bg-orange-50 rounded-lg"
            >
              Simulasi Chat WhatsApp
            </Link>
            <Link
              href="/#harga"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-slate-700 hover:text-pingkas-orange hover:bg-orange-50 rounded-lg"
            >
              Harga & Kuota
            </Link>
            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-slate-700 hover:text-pingkas-orange hover:bg-orange-50 rounded-lg"
            >
              FAQ
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link
              href="/portal"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 font-bold text-sm text-pingkas-teal bg-teal-50 border border-teal-200 rounded-xl"
            >
              <LayoutDashboard className="w-4 h-4" />
              Buka Web Portal User
            </Link>
            <a
              href="https://wa.me/6281234567890?text=Halo%20PingKas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm text-white bg-linear-to-r from-pingkas-orange-light via-pingkas-orange to-pingkas-orange-dark rounded-xl shadow-md shadow-orange-500/25"
            >
              <MessageCircle className="w-4 h-4" />
              Chat WhatsApp Bot Sekarang
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
