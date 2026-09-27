"use client";

import React, { useState, useRef, useEffect } from "react";
import { PingKasLogo } from "./PingKasLogo";
import { Send, CheckCheck } from "lucide-react";
import { inferCategoryName } from "@/lib/categorizer";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  data?: {
    amount?: number;
    category?: string;
    type?: "EXPENSE" | "INCOME";
    usedQuota?: number;
    maxQuota?: number;
  };
}

export function WhatsAppSimulator() {
  const [input, setInput] = useState("");
  const [quotaUsed, setQuotaUsed] = useState(7);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "bot",
      text: "Halo! 👋 Saya PingKas Bot asisten keuangan kamu.\nKetik aja seperti: *Kopi 25rb* atau *Gaji 5jt*",
      time: "09:41",
    },
    {
      id: "2",
      sender: "user",
      text: "Makan siang ayam geprek 25.000",
      time: "09:42",
    },
    {
      id: "3",
      sender: "bot",
      text: "✅ *Catatan Berhasil Disimpan!*\n\n📝 *Deskripsi:* Makan siang ayam geprek\n💰 *Nominal:* Rp 25.000\n📂 *Kategori:* Makanan & Minuman 🍗\n\n📊 *Sisa Kuota Bulan Ini:* 13 / 20 Trx",
      time: "09:42",
      data: {
        amount: 25000,
        category: "Makanan & Minuman",
        type: "EXPENSE",
        usedQuota: 7,
        maxQuota: 20,
      },
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    { label: "☕ Kopi 28rb", text: "Kopi Kenangan 28.000" },
    { label: "⛽ Bensin 50rb", text: "Bensin motor pertalite 50000" },
    { label: "💰 Gaji 8.5jt", text: "Gaji Pokok Kantor 8500000" },
    { label: "📊 Cek Kuota", text: "kuota" },
  ];

  const handleSend = (customText?: string) => {
    const rawText = customText || input;
    if (!rawText.trim()) return;

    const currentTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${prev.length + 1}`,
        sender: "user",
        text: rawText,
        time: currentTime,
      },
    ]);
    setInput("");

    // Bot Response Logic
    setTimeout(() => {
      const lower = rawText.toLowerCase().trim();
      const botTime = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (lower === "kuota" || lower === "status") {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${prev.length + 1}`,
            sender: "bot",
            text: `📊 *Status Kuota PingKas*\n\n⭐ *Paket:* FREE\n🔢 *Terpakai:* ${quotaUsed} / 20 Transaksi\n⏳ *Sisa Kuota:* ${Math.max(
              0,
              20 - quotaUsed
            )} Trx\n🔄 *Reset:* 1 Oktober 2026\n\nUpgrade ke *PRO* untuk 200 trx/bulan!`,
            time: botTime,
          },
        ]);
        return;
      }


      // Parse amount
      let amount = 0;
      const numMatch = rawText.match(/(\d+[\d.,]*)\s*(k|rb|ribu|jt|juta)?/i);
      if (numMatch) {
        const numStr = numMatch[1].replace(/[.,]/g, "");
        const unit = (numMatch[2] || "").toLowerCase();
        let val = parseFloat(numStr);
        if (unit === "k" || unit === "rb" || unit === "ribu") val *= 1000;
        else if (unit === "jt" || unit === "juta") val *= 1000000;
        else if (val < 1000 && !rawText.includes(".")) val *= 1000;
        amount = val;
      } else {
        amount = 35000; // fallback demo
      }

      const isIncome = /(gaji|bonus|penjualan|omset|masuk|terima|tf\s*masuk)/i.test(lower);
      const type = isIncome ? "INCOME" : "EXPENSE";
      const category = inferCategoryName(rawText, type);
      const newUsed = quotaUsed + 1;
      setQuotaUsed(newUsed);

      const formattedAmount = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${prev.length + 1}`,
          sender: "bot",
          text: `✅ *${isIncome ? "Pemasukan" : "Pengeluaran"} Tercatat!*\n\n📝 *Deskripsi:* ${rawText}\n💰 *Nominal:* ${formattedAmount}\n📂 *Kategori:* ${category}\n\n📊 *Sisa Kuota Bulan Ini:* ${Math.max(
            0,
            20 - newUsed
          )} / 20 Trx`,
          time: botTime,
          data: {
            amount,
            category,
            type,
            usedQuota: newUsed,
            maxQuota: 20,
          },
        },
      ]);
    }, 600);
  };


  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 rounded-3xl shadow-2xl shadow-orange-500/10 border-4 border-slate-800 overflow-hidden flex flex-col h-[560px]">
      {/* WhatsApp Header */}
      <div className="bg-[#128C7E] px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PingKasLogo size={38} showText={false} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#128C7E] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm leading-tight">
              <span>PingKas Bot AI</span>
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-300/30">
                OFFICIAL
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
              Online | Catat Otomatis
            </p>
          </div>
        </div>

        <div className="text-[11px] bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full font-semibold">
          Demo Sim
        </div>
      </div>

      {/* WhatsApp Chat Background & Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2]"
        style={{
          backgroundImage: `radial-gradient(#d3cbbe 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      >
        <div className="text-center my-1">
          <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[10px] font-semibold px-3 py-1 rounded-full shadow-xs">
            HARI INI
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                  isUser
                    ? "bg-[#D9FDD3] text-slate-800 rounded-tr-xs"
                    : "bg-white text-slate-800 rounded-tl-xs border border-slate-100"
                }`}
              >
                <div className="whitespace-pre-line font-medium">{msg.text}</div>

                {/* Optional Rich Card for Bot */}
                {msg.data && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#1EA8B8] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      {msg.data.category}
                    </span>
                    <span className="font-extrabold text-[#FF6D00]">
                      {msg.data.type === "INCOME" ? "+" : "-"}
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(msg.data.amount || 0)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-center gap-1 mt-1 text-[9px] text-slate-400 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.time}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-500" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="bg-[#F0F2F5] px-3 py-2 border-t border-slate-200 overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.text)}
            className="shrink-0 text-[11px] font-semibold bg-white hover:bg-orange-50 hover:text-[#FF6D00] hover:border-orange-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 transition-colors shadow-xs"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-[#F0F2F5] p-2.5 flex items-center gap-2 border-t border-slate-200"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik 'Bensin 20rb' atau 'Gaji 5jt'..."
          className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#128C7E] focus:ring-1 focus:ring-[#128C7E]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-[#128C7E] hover:bg-[#0e7468] disabled:opacity-50 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
          aria-label="Kirim Pesan"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
