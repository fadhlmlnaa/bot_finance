import React from "react";
import Link from "next/link";
import { PingKasLogo } from "./PingKasLogo";
import { Heart, MessageCircle, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-4">
            <PingKasLogo size={42} showText={true} horizontal={true} className="brightness-110" />
            <p className="text-sm text-slate-400 leading-relaxed">
              Catat keuangan pribadi dan bisnis tanpa ribet. Cukup kirim chat WhatsApp, pantau di
              web portal & mobile app Flutter secara real-time.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </div>
          </div>

          {/* Nav Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              Produk & Fitur
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/#fitur" className="hover:text-white transition-colors">
                  WhatsApp Bot Finance
                </Link>
              </li>
              <li>
                <Link href="/#fitur" className="hover:text-white transition-colors">
                  Smart AI Categorizer
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-white transition-colors">
                  Web Portal User
                </Link>
              </li>
              <li>
                <Link href="/#harga" className="hover:text-white transition-colors">
                  Paket Kuota & Harga
                </Link>
              </li>
            </ul>
          </div>

          {/* Integrasi & Akses */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              Akses & Portal
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <Link href="/portal" className="text-[#1EA8B8] hover:underline flex items-center gap-1 font-semibold">
                  <span>Portal Transaksi User</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Hubungi Bot WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wide uppercase mb-4">
              Teknologi
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Didukung oleh Next.js 16, Supabase PostgreSQL, Prisma ORM, Baileys WA Engine, dan
              Flutter Mobile.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                Next.js 16
              </span>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                Supabase
              </span>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                Flutter
              </span>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                Baileys WA
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} PingKas Inc. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-1">
            <span>Dibuat dengan</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>untuk produktivitas finansial harian Anda.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
