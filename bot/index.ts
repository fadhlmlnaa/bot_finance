import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as getMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import http from "http";
import pino from "pino";
import qrcode from "qrcode-terminal";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { inferCategoryName } from "../lib/categorizer";
import { checkUserQuota, updateUserSubscription } from "../lib/subscription";
import { SubscriptionPlan } from "@prisma/client";
import {
  parseWhatsAppMessage,
  formatRupiah,
  formatDateTime,
  normalizeAmount,
} from "./parser";
import {
  syncTransactionToGoogleSheet,
  deleteTransactionFromGoogleSheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  formatPaymentMethodLabel,
} from "../lib/sheets";


const AUTH_DIR = path.join(process.cwd(), "bot_auth");

// State for web status and QR rendering
let currentSock: WASocket | null = null;
let latestQr: string | null = null;
let isConnected = false;
let botPhoneNumber = "";

/**
 * Resets WhatsApp authentication session to allow scanning with a new phone number
 */
async function resetWhatsAppSession() {
  console.log("🔄 Mereset sesi WhatsApp bot...");
  try {
    if (currentSock) {
      currentSock.ev.removeAllListeners("connection.update");
      currentSock.ev.removeAllListeners("messages.upsert");
      currentSock.ev.removeAllListeners("creds.update");
      currentSock.end(undefined);
      currentSock = null;
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Gagal membersihkan auth dir:", err);
  }
  isConnected = false;
  latestQr = null;
  botPhoneNumber = "";
  setTimeout(() => {
    startWhatsAppBot();
  }, 1000);
}

/**
 * Lightweight HTTP server for Render health checks and Web QR code display
 */
const PORT = process.env.PORT || 3001;
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  if (url === "/health" || url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "ok",
        connected: isConnected,
        botNumber: botPhoneNumber || "Not connected yet",
        uptime: process.uptime(),
      }),
    );
  }

  // Reset / Change Number Endpoint
  if (url === "/reset" || url === "/logout") {
    await resetWhatsAppSession();
    res.writeHead(302, { Location: "/qr" });
    return res.end();
  }

  if (url === "/qr") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (isConnected) {
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Bot Status</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 420px; }
            .badge { background: #22c55e; color: #000; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; }
            .btn { display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.2rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; text-decoration: none; font-weight: 600; cursor: pointer; transition: 0.2s; }
            .btn:hover { background: #dc2626; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ Bot Terhubung!</h1>
            <p><span class="badge">ONLINE 24/7</span></p>
            <p>Nomor Akun Bot: <br><strong style="font-size: 1.25rem; color: #38bdf8;">+${botPhoneNumber}</strong></p>
            <p style="color: #94a3b8; font-size: 0.9rem;">Bot aktif menerima pesan pencatatan keuangan dan otomatis mencatat ke Supabase.</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 1.5rem 0;">
            <p style="font-size: 0.875rem; color: #cbd5e1;">Ingin mengganti nomor WhatsApp bot?</p>
            <a href="/reset" class="btn" onclick="return confirm('Apakah Anda yakin ingin logout dan mengganti nomor bot?')">Ganti Nomor / Logout</a>
          </div>
        </body>
        </html>
      `);
    }

    if (latestQr) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        latestQr,
      )}`;
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scan QR WhatsApp Bot</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            img { background: white; padding: 12px; border-radius: 8px; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>📲 Scan QR WhatsApp Bot</h2>
            <p>Buka WhatsApp di HP &rarr; Perangkat Tertaut &rarr; Tautkan Perangkat</p>
            <img src="${qrImageUrl}" alt="Scan WhatsApp QR" width="280" height="280" />
            <p style="color: #94a3b8; font-size: 0.875rem;">Halaman akan refresh otomatis setiap 5 detik...</p>
          </div>
        </body>
        </html>
      `);
    }

    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="refresh" content="3">
      </head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white;">
        <h3>⏳ Menyiapkan sesi WhatsApp baru... Halaman akan refresh otomatis.</h3>
      </body>
      </html>
    `);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(
    `🌐 HTTP Server aktif di port ${PORT} (Health check & Web QR ready)`,
  );
});

/**
 * Checks if a phone number is permitted based on ALLOWED_NUMBERS in .env
 */
function isPhoneNumberAllowed(rawNumber: string): boolean {
  const allowedEnv = process.env.ALLOWED_NUMBERS;
  if (!allowedEnv || allowedEnv.trim() === "" || allowedEnv.trim() === "*") {
    return true;
  }

  const cleanSender = rawNumber.replace(/\D/g, "");
  const allowedList = allowedEnv
    .split(",")
    .map((n) => n.trim().replace(/\D/g, ""))
    .filter(Boolean);

  return allowedList.some((allowed) => {
    if (cleanSender === allowed) return true;
    if (allowed.startsWith("0") && cleanSender === "62" + allowed.slice(1))
      return true;
    if (cleanSender.startsWith("0") && allowed === "62" + cleanSender.slice(1))
      return true;
    return false;
  });
}

/**
 * Checks if a phone number has Admin privileges
 */
function isUserAdmin(phoneNumber: string, botOwnerNumber: string): boolean {
  if (botOwnerNumber && phoneNumber === botOwnerNumber) return true;
  const adminEnv = process.env.ADMIN_NUMBERS || "";
  const adminList = adminEnv
    .split(",")
    .map((n) => n.trim().replace(/\D/g, ""))
    .filter(Boolean);

  return adminList.some((adm) => {
    if (phoneNumber === adm) return true;
    if (adm.startsWith("0") && phoneNumber === "62" + adm.slice(1)) return true;
    if (phoneNumber.startsWith("0") && adm === "62" + phoneNumber.slice(1))
      return true;
    return false;
  });
}

// Track recently processed message IDs to avoid duplicates
const processedMsgIds = new Set<string>();

async function startWhatsAppBot() {
  const { state, saveCreds } = await getMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(
    `🤖 Menggunakan Baileys v${version.join(".")} (Latest: ${isLatest})`,
  );

  const botLogger = pino({ level: "silent" });

  const sock = makeWASocket({
    version,
    logger: botLogger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, botLogger),
    },
    browser: ["PingKas Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  currentSock = sock;

  // Handle connection events & QR Code
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      isConnected = false;
      console.clear();
      console.log("\n=======================================================");
      console.log("📲 SCAN QR CODE DI BAWAH MENGGUNAKAN WHATSAPP DI HP:");
      console.log("=======================================================\n");
      qrcode.generate(qr, { small: true });
      console.log(
        "\nBuka WhatsApp -> Pengaturan / Titik Tiga -> Perangkat Tertaut -> Tautkan Perangkat\n",
      );
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = (
        lastDisconnect?.error as { output?: { statusCode?: number } }
      )?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `⚠️ Koneksi terputus (status: ${statusCode}). Reconnect: ${shouldReconnect}`,
      );

      if (shouldReconnect) {
        startWhatsAppBot();
      } else {
        console.log(
          "❌ Sesi telah logout. Silakan jalankan bot kembali untuk scan QR baru.",
        );
        resetWhatsAppSession();
      }
    } else if (connection === "open") {
      isConnected = true;
      latestQr = null;
      botPhoneNumber = sock.user?.id?.split(":")[0]?.split("@")[0] || "";
      console.log("\n✅ WHATSAPP BOT BERHASIL TERHUBUNG!");
      console.log(`📱 Nomor Akun Bot: ${botPhoneNumber}`);
      console.log("🚀 Siap menerima pesan pencatatan keuangan.\n");
    }
  });

  // Save auth credentials whenever updated
  sock.ev.on("creds.update", saveCreds);

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message) continue;

      const msgId = msg.key.id;
      if (msgId && processedMsgIds.has(msgId)) continue;
      if (msgId) {
        processedMsgIds.add(msgId);
        if (processedMsgIds.size > 2000) {
          const firstKey = processedMsgIds.values().next().value;
          if (firstKey) processedMsgIds.delete(firstKey);
        }
      }

      if (msg.key.remoteJid?.endsWith("@broadcast")) {
        continue;
      }

      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;

      const textMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      let trimmedText = textMessage.trim();
      if (!trimmedText) continue;

      // Ignore bot's own automated response messages
      if (
        trimmedText.startsWith("🤖 *BOT PENCATAT KEUANGAN*") ||
        trimmedText.startsWith("✅ *TRANSAKSI DICATAT*") ||
        trimmedText.startsWith("📊 *REKAP KEUANGAN ANDA*") ||
        trimmedText.startsWith("👑 *STATUS MEMBERSHIP*") ||
        trimmedText.startsWith("📦 *PAKET MEMBERSHIP*") ||
        trimmedText.startsWith("⛔ *KUOTA TRANSAKSI HABIS*") ||
        trimmedText.startsWith("🗑️ *TRANSAKSI BERHASIL DIHAPUS*") ||
        trimmedText.startsWith("📋 *DAFTAR TRANSAKSI TERAKHIR*") ||
        trimmedText.includes("Belum ada transaksi yang tercatat")
      ) {
        continue;
      }

      const isGroup = senderJid.endsWith("@g.us");
      const meUser = sock.user || (state.creds as unknown as { me?: { id?: string; lid?: string } })?.me;
      const botRawId = meUser?.id || "";
      const botRawLid = meUser?.lid || "";
      const botPhoneNumber = botRawId.split(":")[0]?.split("@")[0]?.replace(/\D/g, "") || "";
      const botLid = botRawLid.split(":")[0]?.split("@")[0]?.replace(/\D/g, "") || "";
      const botOwnerNumber = botPhoneNumber;

      let phoneNumber = "";
      if (isGroup) {
        // Di grup, pengirim transaksi adalah participant yang mengirim pesan
        let rawParticipant =
          (msg.key as unknown as { participantPn?: string })?.participantPn ||
          msg.key.participant ||
          (msg as unknown as { participant?: string })?.participant ||
          "";

        if (msg.key.fromMe) {
          phoneNumber = botPhoneNumber || botOwnerNumber;
        } else {
          if (rawParticipant.endsWith("@lid")) {
            try {
              const mapped = await (sock as unknown as { signalRepository?: { lidToJidMapping?: (lid: string) => Promise<string> } })
                ?.signalRepository?.lidToJidMapping?.(rawParticipant);
              if (mapped) rawParticipant = mapped;
            } catch {
              // ignore
            }
          }
          phoneNumber = rawParticipant.split("@")[0].split(":")[0].replace(/\D/g, "");
        }
      } else {
        if (msg.key.fromMe || senderJid.endsWith("@lid")) {
          phoneNumber = botPhoneNumber || botOwnerNumber;
        } else {
          phoneNumber = senderJid
            .split("@")[0]
            .split(":")[0]
            .replace(/\D/g, "");
        }
      }

      if (!phoneNumber) continue;

      // Filter pesan di Grup WhatsApp: Respon jika Bot di-TAG (biru), direply, atau disebut @PingKas / PingKas / @bot
      let processedText = trimmedText;
      if (isGroup) {
        const contextInfo = msg.message.extendedTextMessage?.contextInfo;
        const mentionedJids: string[] = contextInfo?.mentionedJid || [];
        const quotedParticipant: string = contextInfo?.participant || "";

        const botShortNum = botPhoneNumber.replace(/^62/, "");

        // 1. Cek apakah bot di-mention via WhatsApp tag popup (@ kontak biru)
        const isMentioned = mentionedJids.some((jid) => {
          const cleanJid = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
          return (
            (botPhoneNumber && (jid.includes(botPhoneNumber) || cleanJid === botPhoneNumber)) ||
            (botLid && (jid.includes(botLid) || cleanJid === botLid)) ||
            (botRawId && jid.includes(botRawId.split(":")[0])) ||
            (botRawLid && jid.includes(botRawLid.split(":")[0]))
          );
        });

        // 2. Cek apakah user mereply pesan dari bot
        const isQuoted =
          (botPhoneNumber && quotedParticipant.includes(botPhoneNumber)) ||
          (botLid && quotedParticipant.includes(botLid)) ||
          (botRawId && quotedParticipant.includes(botRawId.split(":")[0])) ||
          (botRawLid && quotedParticipant.includes(botRawLid.split(":")[0]));

        // 3. Cek apakah teks mengandung @PingKas, PingKas, @bot, atau nomor HP bot
        const hasKeyword = new RegExp(
          `@?pingkas|@?bot|@${botPhoneNumber}|@0${botShortNum}|@${botShortNum}`,
          "i"
        ).test(trimmedText);

        if (!isMentioned && !isQuoted && !hasKeyword) {
          // Abaikan obrolan umum grup agar bot tidak spam
          continue;
        }

        // Hapus karakter invisible Unicode WhatsApp & bersihkan tag mention dari teks
        let cleaned = trimmedText.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "").trim();
        cleaned = cleaned
          .replace(
            new RegExp(
              `@${botPhoneNumber}|@0${botShortNum}|@${botShortNum}|@\\d{8,16}|@pingkas|@bot|^pingkas\\b|^bot\\b`,
              "gi"
            ),
            ""
          )
          .replace(/^@\S+\s*/, "") // Bersihkan tag kontak biru di awal jika ada
          .replace(/^[:,\s-]+/, "")
          .trim();

        processedText = cleaned;

        if (!processedText) {
          // Jika user hanya tag @bot tanpa pesan, kirim panduan singkat
          await sock.sendMessage(
            senderJid,
            {
              text: `👋 Halo @${phoneNumber}! Tag saya bersama catatan keuangan Anda.\n\n*Contoh Penggunaan di Grup:*\n• \`@PingKas Bakso 15k\`\n• \`@PingKas Gaji 5jt\`\n• \`@PingKas rekap\`\n• \`@PingKas bantuan\``,
              mentions: [`${phoneNumber}@s.whatsapp.net`],
            },
            { quoted: msg }
          );
          continue;
        }
      }

      const senderName = msg.pushName || `User ${phoneNumber.slice(-4)}`;

      // Check Whitelist
      if (!isPhoneNumberAllowed(phoneNumber)) {
        console.log(
          `⛔ Pesan diabaikan: ${phoneNumber} tidak terdaftar di whitelist.`
        );
        continue;
      }

      console.log(
        `📩 Pesan masuk dari ${senderName} (${phoneNumber})${isGroup ? " [WA GROUP]" : ""}: "${processedText}"`
      );

      // Pakai processedText (tanpa tag mention @bot) untuk seluruh command & parsing transaksi
      trimmedText = processedText;

      // ==========================================
      // ADMIN COMMANDS (Khusus Owner / Admin)
      // ==========================================
      const isAdmin = isUserAdmin(phoneNumber, botOwnerNumber);

      // 1. Admin Command: !upgrade <nomor> <hari> <paket> [custom_kuota]
      // Contoh: !upgrade 62812345678 30 PRO atau !upgrade 62812345678 30 UNLIMITED
      if (isAdmin && trimmedText.startsWith("!upgrade")) {
        const parts = trimmedText.split(/\s+/);
        if (parts.length < 4) {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `⚠️ *Format Admin Upgrade:*\n` +
                `\`!upgrade <nomor_hp> <jumlah_hari> <FREE|PRO|UNLIMITED> [custom_kuota]\`\n\n` +
                `*Contoh:*\n` +
                `• \`!upgrade 62812345678 30 PRO\`\n` +
                `• \`!upgrade 62812345678 30 UNLIMITED\`\n` +
                `• \`!upgrade 62812345678 30 PRO 500\` (Kustom kuota 500)`,
            },
            { quoted: msg },
          );
          continue;
        }

        const targetPhone = parts[1].replace(/\D/g, "");
        const days = parseInt(parts[2]) || 30;
        const rawPlan = parts[3].toUpperCase();
        const customQuota = parts[4] ? parseInt(parts[4]) : undefined;

        if (
          !Object.values(SubscriptionPlan).includes(rawPlan as SubscriptionPlan)
        ) {
          await sock.sendMessage(
            senderJid,
            { text: `❌ Paket tidak valid. Pilih: FREE, PRO, atau UNLIMITED.` },
            { quoted: msg },
          );
          continue;
        }

        try {
          const updated = await updateUserSubscription({
            phoneNumber: targetPhone,
            plan: rawPlan as SubscriptionPlan,
            durationDays: days,
            customQuota,
          });

          await sock.sendMessage(
            senderJid,
            {
              text:
                `✅ *BERHASIL AKTIVASI MEMBERSHIP*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👤 User     : *${targetPhone}*\n` +
                `📦 Paket    : *${updated.plan}*\n` +
                `📊 Kuota    : *${updated.monthlyQuota} transaksi/bln*\n` +
                `⏳ Aktif s/d: *${updated.subscriptionEnd ? formatDateTime(updated.subscriptionEnd) : "Permanen"}*\n` +
                `━━━━━━━━━━━━━━━━━━━━`,
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Gagal upgrade:", err);
          await sock.sendMessage(
            senderJid,
            { text: `❌ Gagal upgrade user: ${err}` },
            { quoted: msg },
          );
        }
        continue;
      }

      // 2. Admin Command: !setkuota <nomor> <jumlah_kuota>
      if (isAdmin && trimmedText.startsWith("!setkuota")) {
        const parts = trimmedText.split(/\s+/);
        if (parts.length < 3) {
          await sock.sendMessage(
            senderJid,
            {
              text: `⚠️ *Format:*\n\`!setkuota <nomor_hp> <jumlah_kuota>\`\nContoh: \`!setkuota 62812345678 300\``,
            },
            { quoted: msg },
          );
          continue;
        }

        const targetPhone = parts[1].replace(/\D/g, "");
        const newQuota = parseInt(parts[2]);

        if (isNaN(newQuota) || newQuota <= 0) {
          await sock.sendMessage(
            senderJid,
            { text: `❌ Jumlah kuota harus angka positif.` },
            { quoted: msg },
          );
          continue;
        }

        try {
          const user = await prisma.user.update({
            where: { phoneNumber: targetPhone },
            data: { monthlyQuota: newQuota },
          });

          await sock.sendMessage(
            senderJid,
            {
              text:
                `✅ *KUOTA USER DIPERBARUI*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👤 User  : *${user.phoneNumber}*\n` +
                `📊 Kuota : *${user.monthlyQuota} transaksi/bulan*\n` +
                `━━━━━━━━━━━━━━━━━━━━`,
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Gagal set kuota:", err);
          await sock.sendMessage(
            senderJid,
            { text: `❌ User tidak ditemukan di database.` },
            { quoted: msg },
          );
        }
        continue;
      }

      // ==========================================
      // CEK REGISTRASI USER (Hanya User Terdaftar)
      // ==========================================
      const cleanDigits = phoneNumber.replace(/\D/g, "");
      const normalizedWith62 = cleanDigits.startsWith("0")
        ? "62" + cleanDigits.slice(1)
        : cleanDigits.startsWith("62")
        ? cleanDigits
        : "62" + cleanDigits;
      const normalizedWith0 = cleanDigits.startsWith("62")
        ? "0" + cleanDigits.slice(2)
        : cleanDigits.startsWith("0")
        ? cleanDigits
        : "0" + cleanDigits;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: phoneNumber },
            { phoneNumber: cleanDigits },
            { phoneNumber: normalizedWith62 },
            { phoneNumber: normalizedWith0 },
            { phoneNumber: `+${normalizedWith62}` },
            { phoneNumber: `+${cleanDigits}` },
          ],
        },
      });

      if (!user) {
        const displayPhone = cleanDigits.startsWith("62") ? "0" + cleanDigits.slice(2) : cleanDigits;
        if (isGroup) {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `⚠️ *AKUN BELUM TERDAFTAR*\n\n` +
                `Halo @${phoneNumber}, nomor WhatsApp Anda (${displayPhone}) belum terdaftar di sistem PingKas.\n\n` +
                `Silakan daftar/login terlebih dahulu melalui Web Portal atau Aplikasi PingKas:\n` +
                `🌐 https://bot-finance-pi.vercel.app/portal`,
              mentions: [`${phoneNumber}@s.whatsapp.net`],
            },
            { quoted: msg }
          );
        } else {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `⚠️ *NOMOR WHATSAPP BELUM TERDAFTAR*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `Halo *${senderName}* (@${phoneNumber})!\n\n` +
                `Nomor WhatsApp Anda (${displayPhone}) belum terdaftar di sistem *PingKas*.\n\n` +
                `Silakan daftar atau login terlebih dahulu melalui:\n` +
                `🌐 *Web Portal:* https://bot-finance-pi.vercel.app/portal\n` +
                `📱 *Aplikasi Mobile PingKas*\n\n` +
                `_Setelah mendaftar, Anda langsung mendapatkan kuota gratis dan bot siap mencatat transaksi Anda!_ 🚀\n` +
                `━━━━━━━━━━━━━━━━━━━━`,
              mentions: [`${phoneNumber}@s.whatsapp.net`],
            },
            { quoted: msg }
          );
        }
        console.log(`⛔ Pesan ditolak: ${phoneNumber} (${displayPhone}) belum terdaftar di database.`);
        continue;
      }

      // ==========================================
      // USER COMMANDS (Hanya untuk User Terdaftar)
      // ==========================================

      // 1. Command: Help / Bantuan
      if (/^(help|bantuan|menu|info)$/i.test(trimmedText)) {
        const helpMessage =
          `🤖 *BOT PENCATAT KEUANGAN*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `*Cara Mencatat Pengeluaran:*\n` +
          `• \`Parkir 2000\` (Tunai)\n` +
          `• \`Beli baju 150rb tf\` / \`bca\` (Bank)\n` +
          `• \`Kopi 25rb qris\` / \`gopay\` (E-Wallet)\n\n` +
          `*Cara Mencatat Pemasukan (+):*\n` +
          `• \`+5000000 Gaji bulanan\` (Bank)\n` +
          `• \`+50k Cash bonus\` (Tunai)\n\n` +
          `*Hapus / Batalkan Transaksi:*\n` +
          `• \`!hapus terakhir\` / \`batal\` / \`undo\` (Hapus transaksi terakhir)\n` +
          `• \`!hapus 1\` / \`!hapus 2\` (Hapus nomor dari riwayat)\n` +
          `• \`!riwayat\` (Lihat 5 transaksi terakhir & ID-nya)\n\n` +
          `*Atur Saldo Awal:*\n` +
          `• \`!setsaldo 1000000\` (Total Saldo Awal)\n` +
          `• \`!setsaldo bank 700000\` (Saldo Awal Bank)\n` +
          `• \`!setsaldo cash 300000\` (Saldo Awal Tunai)\n\n` +
          `*Perintah Fitur & Spreadsheet:*\n` +
          `• \`rekap\` : Lihat saldo awal, mutasi & saldo akhir\n` +
          `• \`!setsheet\` : Hubungkan Google Sheets (Auto-Sync)\n` +
          `• \`rekap excel\` : Unduh file CSV rekap per bulan\n` +
          `• \`status\` / \`kuota\` : Cek sisa kuota & masa aktif\n` +
          `• \`paket\` : Info harga langganan PRO/UNLIMITED\n` +
          `• \`bantuan\` : Tampilkan menu ini\n` +
          `━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(
          senderJid,
          { text: helpMessage },
          { quoted: msg },
        );
        continue;
      }

      // 1.1 Command: Riwayat Transaksi Terakhir (!riwayat / !list)
      if (/^(!riwayat|!list|riwayat|daftar\s*transaksi)$/i.test(trimmedText)) {
        try {
          const recentTransactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            orderBy: { date: "desc" },
            take: 5,
            include: { category: true },
          });

          if (recentTransactions.length === 0) {
            await sock.sendMessage(
              senderJid,
              { text: "ℹ️ Anda belum memiliki riwayat transaksi." },
              { quoted: msg }
            );
            continue;
          }

          let listText = `📋 *DAFTAR TRANSAKSI TERAKHIR*\n━━━━━━━━━━━━━━━━━━━━\n`;
          recentTransactions.forEach((trx, index) => {
            const isIncome = trx.type === "INCOME";
            const icon = isIncome ? "💰" : "💸";
            const paymentLabel = formatPaymentMethodLabel(trx.paymentMethod);
            const shortId = trx.id.slice(0, 8);
            listText += `*[${index + 1}]* ${icon} *${trx.description}*\n`;
            listText += `    ${formatRupiah(trx.amount)} (${paymentLabel}) • ${formatDateTime(trx.date)}\n`;
            listText += `    _ID: \`${shortId}\`_\n\n`;
          });

          listText += `━━━━━━━━━━━━━━━━━━━━\n`;
          listText += `*Cara Hapus Transaksi:*\n`;
          listText += `• \`!hapus 1\` (Hapus nomor 1)\n`;
          listText += `• \`!hapus terakhir\` / \`batal\` (Hapus paling baru)\n`;
          listText += `• \`!hapus <ID>\` (Hapus berdasarkan ID)`;

          await sock.sendMessage(
            senderJid,
            { text: listText },
            { quoted: msg }
          );
        } catch (err) {
          console.error("Gagal mengambil riwayat transaksi:", err);
          await sock.sendMessage(
            senderJid,
            { text: "❌ Terjadi kendala saat mengambil riwayat transaksi." },
            { quoted: msg }
          );
        }
        continue;
      }

      // 1.2 Command: Hapus / Batalkan Transaksi (!hapus / !batal / batal / undo / !del)
      if (
        trimmedText.startsWith("!hapus") ||
        trimmedText.startsWith("!del") ||
        trimmedText.startsWith("!delete") ||
        /^(!batal|batal|undo|hapus\s*terakhir)$/i.test(trimmedText)
      ) {
        try {
          const rawArg = trimmedText
            .replace(/^(!hapus|!del|!delete|!batal|batal|undo|hapus)\s*/i, "")
            .trim();

          let targetTransaction = null;

          if (
            !rawArg ||
            rawArg.toLowerCase() === "terakhir" ||
            rawArg.toLowerCase() === "last" ||
            /^(!batal|batal|undo)$/i.test(trimmedText)
          ) {
            // Hapus transaksi terakhir milik user
            targetTransaction = await prisma.transaction.findFirst({
              where: { userId: user.id },
              orderBy: { date: "desc" },
              include: { category: true },
            });
          } else if (/^\d+$/.test(rawArg)) {
            // Hapus berdasarkan nomor urut riwayat (misal !hapus 1)
            const index = parseInt(rawArg, 10);
            if (index >= 1 && index <= 20) {
              const recent = await prisma.transaction.findMany({
                where: { userId: user.id },
                orderBy: { date: "desc" },
                take: index,
                include: { category: true },
              });
              if (recent.length >= index) {
                targetTransaction = recent[index - 1];
              }
            }
          } else {
            // Hapus berdasarkan ID atau partial prefix ID
            targetTransaction = await prisma.transaction.findFirst({
              where: {
                userId: user.id,
                id: { startsWith: rawArg },
              },
              include: { category: true },
            });
          }

          if (!targetTransaction) {
            await sock.sendMessage(
              senderJid,
              {
                text:
                  `⚠️ *Transaksi Tidak Ditemukan*\n\n` +
                  `Pastikan ID atau nomor transaksi valid.\n` +
                  `Ketik \`!riwayat\` untuk melihat daftar transaksi Anda beserta ID-nya.`,
              },
              { quoted: msg }
            );
            continue;
          }

          // Hapus transaksi dari database
          await prisma.transaction.delete({
            where: { id: targetTransaction.id },
          });

          // Otomatis hapus baris transaksi di Google Sheets jika auto-sync aktif
          void deleteTransactionFromGoogleSheet(targetTransaction, user);

          const isIncome = targetTransaction.type === "INCOME";
          const icon = isIncome ? "💰" : "💸";
          const typeLabel = isIncome ? "Pemasukan (+)" : "Pengeluaran (-)";
          const paymentLabel = formatPaymentMethodLabel(targetTransaction.paymentMethod);

          const deleteNotice =
            `🗑️ *TRANSAKSI BERHASIL DIHAPUS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 Ket       : *${targetTransaction.description}*\n` +
            `📂 Kategori  : ${targetTransaction.category?.name || "Umum"}\n` +
            `${icon} Tipe      : ${typeLabel}\n` +
            `💳 Metode    : ${paymentLabel}\n` +
            `💵 Nominal   : *${formatRupiah(targetTransaction.amount)}*\n` +
            `📅 Waktu     : ${formatDateTime(targetTransaction.date)}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 _Saldo & mutasi keuangan Anda telah otomatis disesuaikan kembali._`;

          await sock.sendMessage(
            senderJid,
            { text: deleteNotice },
            { quoted: msg }
          );
          console.log(`🗑️ Transaksi ${targetTransaction.id} (${targetTransaction.description}) berhasil dihapus oleh ${phoneNumber}`);
        } catch (err) {
          console.error("Gagal menghapus transaksi via WA:", err);
          await sock.sendMessage(
            senderJid,
            { text: "❌ Maaf, gagal menghapus transaksi. Coba lagi nanti." },
            { quoted: msg }
          );
        }
        continue;
      }

      // 2. Command: Set Saldo Awal (!setsaldo / saldo awal)
      if (
        trimmedText.startsWith("!setsaldo") ||
        /^saldo\s*awal/i.test(trimmedText)
      ) {
        const cleanCommand = trimmedText.replace(/^!setsaldo\s*|^saldo\s*awal\s*/i, "").trim();

        if (!cleanCommand) {
          // Tampilkan status saldo awal saat ini jika tanpa argumen
          const initTotal = user.initialBalance || 0;
          const initBank = user.initialBankBalance || 0;
          const initCash = user.initialCashBalance || 0;

          await sock.sendMessage(
            senderJid,
            {
              text:
                `💰 *PENGATURAN SALDO AWAL*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `• Saldo Awal Total : *${formatRupiah(initTotal)}*\n` +
                `  ├ 🏦 Saldo Bank  : *${formatRupiah(initBank)}*\n` +
                `  └ 💵 Saldo Tunai : *${formatRupiah(initCash)}*\n\n` +
                `*Cara Mengatur Saldo Awal:*\n` +
                `• \`!setsaldo 1000000\` (Set Total)\n` +
                `• \`!setsaldo bank 750k\` (Set Saldo Bank)\n` +
                `• \`!setsaldo cash 250k\` (Set Saldo Tunai)\n` +
                `━━━━━━━━━━━━━━━━━━━━`,
            },
            { quoted: msg }
          );
          continue;
        }

        const parts = cleanCommand.split(/\s+/);
        let targetType: "TOTAL" | "BANK" | "CASH" = "TOTAL";
        let amountStr = "";

        if (parts.length >= 2 && /^(bank|tf|rekening|bca|mandiri|bri|bni)/i.test(parts[0])) {
          targetType = "BANK";
          amountStr = parts.slice(1).join("");
        } else if (parts.length >= 2 && /^(cash|tunai|kontan|dompet)/i.test(parts[0])) {
          targetType = "CASH";
          amountStr = parts.slice(1).join("");
        } else {
          amountStr = cleanCommand;
        }

        const amount = normalizeAmount(amountStr);
        if (amount === null || isNaN(amount) || amount < 0) {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `⚠️ *Format Nominal Saldo Awal Tidak Valid*\n\n` +
                `*Contoh Perintah:*\n` +
                `• \`!setsaldo 1500000\`\n` +
                `• \`!setsaldo bank 1jt\`\n` +
                `• \`!setsaldo cash 500k\``,
            },
            { quoted: msg }
          );
          continue;
        }

        let updatedData = {};
        if (targetType === "BANK") {
          const currentCash = user.initialCashBalance || 0;
          updatedData = {
            initialBankBalance: amount,
            initialBalance: amount + currentCash,
          };
        } else if (targetType === "CASH") {
          const currentBank = user.initialBankBalance || 0;
          updatedData = {
            initialCashBalance: amount,
            initialBalance: currentBank + amount,
          };
        } else {
          updatedData = {
            initialBalance: amount,
            initialBankBalance: amount,
            initialCashBalance: 0,
          };
        }

        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updatedData,
        });

        await sock.sendMessage(
          senderJid,
          {
            text:
              `✅ *SALDO AWAL BERHASIL DISIMPAN!*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💰 Saldo Awal Total : *${formatRupiah(updatedUser.initialBalance)}*\n` +
              `├ 🏦 Saldo Bank     : *${formatRupiah(updatedUser.initialBankBalance)}*\n` +
              `└ 💵 Saldo Tunai    : *${formatRupiah(updatedUser.initialCashBalance)}*\n\n` +
              `_Saldo awal ini akan otomatis dihitung dalam rekap keuangan dan ekspor spreadsheet._ 📊`,
          },
          { quoted: msg }
        );
        continue;
      }

      // 3. Command: Info Paket / Upgrade
      if (/^(paket|harga|upgrade|langganan|premium)$/i.test(trimmedText)) {
        const pricingText =
          `📦 *PILIHAN PAKET MEMBERSHIP*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `1️⃣ *FREE* (Gratis)\n` +
          `• Kuota: *20 transaksi / bulan*\n` +
          `• Biaya: *Rp 0*\n\n` +
          `2️⃣ *PRO* (Rekomendasi ⭐)\n` +
          `• Kuota: *200 transaksi / bulan*\n` +
          `• Biaya: *Rp 15.000 / 30 hari*\n\n` +
          `3️⃣ *UNLIMITED* (Tanpa Batas 🚀)\n` +
          `• Kuota: *Tanpa batas transaksi (∞)*\n` +
          `• Biaya: *Rp 29.000 / 30 hari*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💳 *Cara Berlangganan:*\n` +
          `1. Hubungi Admin atau transfer sesuai nominal paket.\n` +
          `2. Admin akan langsung mengaktifkan akun Anda.\n` +
          `━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(
          senderJid,
          { text: pricingText },
          { quoted: msg },
        );
        continue;
      }

      // 4. Command: Status & Sisa Kuota
      if (/^(status|kuota|membership|akun)$/i.test(trimmedText)) {
        try {
          const quota = await checkUserQuota(user);
          const expiryText = quota.expiresAt
            ? formatDateTime(quota.expiresAt)
            : "Permanen (Free)";

          const statusText =
            `👑 *STATUS MEMBERSHIP ANDA*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Pengguna  : *${user.name || senderName}*\n` +
            `📱 Nomor     : *${user.phoneNumber}*\n` +
            `📦 Paket     : *${quota.plan}*\n` +
            `📊 Pemakaian : *${quota.used} / ${quota.isUnlimited ? "∞" : quota.maxQuota} transaksi*\n` +
            `💡 Sisa Kuota: *${quota.isUnlimited ? "Tanpa Batas (∞)" : quota.remaining + " transaksi"}*\n` +
            `⏳ Masa Aktif: *${expiryText}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `_Ketik *paket* untuk melihat pilihan upgrade._`;

          await sock.sendMessage(
            senderJid,
            { text: statusText },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Gagal cek status:", err);
          await sock.sendMessage(
            senderJid,
            { text: "❌ Terjadi kendala saat memeriksa status kuota." },
            { quoted: msg },
          );
        }
        continue;
      }

      // 5. Command: Auto-sync Google Sheets (!setsheet)
      if (
        trimmedText.startsWith("!setsheet") ||
        trimmedText.startsWith("!sheet") ||
        trimmedText.startsWith("!syncsheet")
      ) {
        const parts = trimmedText.split(/\s+/);

        // Sub-command: Status & Panduan jika tanpa argumen
        if (parts.length < 2) {
          const currentStatus = user.autoSyncSheet && user.sheetWebhookUrl
            ? `🟢 *AKTIF*\n🔗 URL: \`${user.sheetWebhookUrl.slice(0, 45)}...\``
            : `🔴 *NONAKTIF*`;

          await sock.sendMessage(
            senderJid,
            {
              text:
                `📊 *PENGATURAN AUTO-SYNC GOOGLE SHEETS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `Status Saat Ini: ${currentStatus}\n\n` +
                `*Perintah WhatsApp:* \n` +
                `• \`!setsheet <URL>\` : Pasang Webhook Apps Script\n` +
                `• \`!setsheet test\` : Uji coba kirim 1 baris data\n` +
                `• \`!setsheet code\` : Minta kode script template\n` +
                `• \`!setsheet off\` : Nonaktifkan auto-sync\n\n` +
                `*Contoh Pasang:* \n` +
                `\`!setsheet https://script.google.com/macros/s/.../exec\`\n` +
                `━━━━━━━━━━━━━━━━━━━━`,
            },
            { quoted: msg }
          );
          continue;
        }

        const subCommand = parts[1].trim();

        // Sub-command: Minta Template Kode Apps Script
        if (subCommand.toLowerCase() === "code" || subCommand.toLowerCase() === "script") {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `📝 *KODE GOOGLE APPS SCRIPT PINGKAS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `Salin kode di bawah ini ke Google Sheets Anda:\n` +
                `1. Buka Google Sheets > Ekstensi > Apps Script\n` +
                `2. Tempel kode di bawah ini\n` +
                `3. Klik Deploy > New Deployment > Web App (Who has access: Anyone)\n` +
                `4. Salin Web App URL dan ketik:\n` +
                `\`!setsheet <URL_ANDA>\`\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `\`\`\`javascript\n${GOOGLE_APPS_SCRIPT_TEMPLATE}\`\`\``,
            },
            { quoted: msg }
          );
          continue;
        }

        // Sub-command: Uji Coba Webhook (!setsheet test)
        if (subCommand.toLowerCase() === "test") {
          if (!user.sheetWebhookUrl) {
            await sock.sendMessage(
              senderJid,
              {
                text: `⚠️ Anda belum memasang Webhook URL Google Sheets. Pasang terlebih dahulu dengan perintah: \`!setsheet <URL>\``,
              },
              { quoted: msg }
            );
            continue;
          }

          await sock.sendMessage(
            senderJid,
            { text: `⏳ Mengirim baris data pengujian ke Google Spreadsheet Anda...` },
            { quoted: msg }
          );

          const testRes = await syncTransactionToGoogleSheet(
            {
              id: `TEST-${Date.now().toString().slice(-4)}`,
              amount: 10000,
              description: "Uji Coba Sinkronisasi WhatsApp",
              type: "EXPENSE",
              paymentMethod: "CASH",
              date: new Date(),
              category: { name: "Uji Sistem" },
            },
            user
          );

          if (testRes.synced) {
            await sock.sendMessage(
              senderJid,
              {
                text: `🎉 *UJI COBA BERHASIL!*\n1 baris data contoh berhasil masuk ke Google Spreadsheet Anda pada tab bulan ini.`,
              },
              { quoted: msg }
            );
          } else {
            await sock.sendMessage(
              senderJid,
              {
                text: `❌ *UJI COBA GAGAL:*\n${testRes.error || "Pastikan Web App di-deploy dengan akses 'Anyone'."}`,
              },
              { quoted: msg }
            );
          }
          continue;
        }

        // Sub-command: Nonaktifkan (!setsheet off)
        const isOff =
          subCommand.toLowerCase() === "off" ||
          subCommand.toLowerCase() === "disable" ||
          subCommand.toLowerCase() === "nonaktif";

        if (isOff) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              sheetWebhookUrl: null,
              autoSyncSheet: false,
            },
          });

          await sock.sendMessage(
            senderJid,
            { text: `✅ Auto-sync ke Google Spreadsheet telah dinonaktifkan.` },
            { quoted: msg }
          );
          continue;
        }

        // Simpan URL Webhook baru
        const rawUrl = subCommand;
        if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
          await sock.sendMessage(
            senderJid,
            {
              text: `⚠️ URL Webhook tidak valid. Pastikan dimulai dengan \`https://script.google.com/macros/s/.../exec\``,
            },
            { quoted: msg }
          );
          continue;
        }

        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            sheetWebhookUrl: rawUrl,
            autoSyncSheet: true,
          },
        });

        // Langsung kirim 1 baris test koneksi otomatis
        void syncTransactionToGoogleSheet(
          {
            id: `PING-${Date.now().toString().slice(-4)}`,
            amount: 0,
            description: "PingKas Auto-Sync Terhubung",
            type: "INCOME",
            paymentMethod: "BANK",
            date: new Date(),
            category: { name: "Aktivasi" },
          },
          updatedUser
        );

        await sock.sendMessage(
          senderJid,
          {
            text:
              `✅ *AUTO-SYNC GOOGLE SHEETS BERHASIL DIAKTIFKAN!*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🔗 URL: \`${rawUrl}\`\n\n` +
              `Setiap transaksi yang Anda catat lewat WA, Web, atau Mobile akan otomatis tersimpan ke tab bulan berjalan di Google Spreadsheet Anda.\n\n` +
              `💡 Ketik \`!setsheet test\` kapan saja untuk menguji koneksi.`,
          },
          { quoted: msg }
        );
        continue;
      }

      // 6. Command: Download Rekap Spreadsheet (rekap excel / export)
      if (
        /^(rekap\s*excel|rekap\s*spreadsheet|export|unduh\s*excel|download\s*rekap)$/i.test(
          trimmedText,
        )
      ) {
        const backendBase =
          process.env.NEXT_PUBLIC_APP_URL || "https://bot-finance-pi.vercel.app";
        const downloadUrl = `${backendBase}/api/transactions/export?phoneNumber=${user.phoneNumber}`;

        await sock.sendMessage(
          senderJid,
          {
            text:
              `📥 *UNDUH REKAP SPREADSHEET (EXCEL/CSV)*\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `Klik tautan di bawah untuk mengunduh rekap transaksi Anda:\n\n` +
              `🔗 *Download File:*\n${downloadUrl}\n\n` +
              `💻 *Buka Web Portal:*\n${backendBase}/portal\n` +
              `━━━━━━━━━━━━━━━━━━━━`,
          },
          { quoted: msg },
        );
        continue;
      }

      // 7. Command: Rekapitulasi / Summary
      if (/^(rekap|laporan|summary|saldo)$/i.test(trimmedText)) {
        try {
          const transactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            include: { category: true },
          });

          const initialTotal = user.initialBalance || 0;
          const initialBank = user.initialBankBalance || 0;
          const initialCash = user.initialCashBalance || 0;

          let totalIncome = 0;
          let totalExpense = 0;
          let incomeBank = 0;
          let expenseBank = 0;
          let incomeCash = 0;
          let expenseCash = 0;
          let incomeEWallet = 0;
          let expenseEWallet = 0;

          const expenseCategoryMap: Record<
            string,
            { total: number; count: number }
          > = {};

          for (const t of transactions) {
            const method = t.paymentMethod || "CASH";
            if (t.type === "INCOME") {
              totalIncome += t.amount;
              if (method === "BANK") incomeBank += t.amount;
              else if (method === "CASH") incomeCash += t.amount;
              else if (method === "E_WALLET") incomeEWallet += t.amount;
            } else {
              totalExpense += t.amount;
              if (method === "BANK") expenseBank += t.amount;
              else if (method === "CASH") expenseCash += t.amount;
              else if (method === "E_WALLET") expenseEWallet += t.amount;

              const catName = t.category?.name || "Lainnya";
              if (!expenseCategoryMap[catName]) {
                expenseCategoryMap[catName] = { total: 0, count: 0 };
              }
              expenseCategoryMap[catName].total += t.amount;
              expenseCategoryMap[catName].count += 1;
            }
          }

          const netChange = totalIncome - totalExpense;
          const finalBalance = initialTotal + netChange;
          const currentBank = initialBank + incomeBank - expenseBank;
          const currentCash = initialCash + incomeCash - expenseCash;

          const sortedCategories = Object.entries(expenseCategoryMap).sort(
            (a, b) => b[1].total - a[1].total,
          );

          let categoryText = "";
          if (sortedCategories.length > 0) {
            categoryText =
              `\n📌 *Pengeluaran per Kategori:*\n` +
              sortedCategories
                .map(
                  ([name, stat]) =>
                    `• ${name}: *${formatRupiah(stat.total)}* (${stat.count}x)`,
                )
                .join("\n");
          }

          const summaryText =
            `📊 *REKAP KEUANGAN ANDA*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Pengguna : *${user.name || senderName}*\n` +
            `💰 Saldo Awal : *${formatRupiah(initialTotal)}*\n` +
            `💵 Total Pemasukan : *${formatRupiah(totalIncome)}*\n` +
            `💸 Total Pengeluaran : *${formatRupiah(totalExpense)}*\n` +
            `📈 Mutasi Bersih : *${formatRupiah(netChange)}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💳 *SALDO AKHIR : ${formatRupiah(finalBalance)}*\n` +
            `  ├ 🏦 Bank / Rekening : *${formatRupiah(currentBank)}*\n` +
            `  ├ 💵 Tunai (Cash)   : *${formatRupiah(currentCash)}*` +
            (incomeEWallet > 0 || expenseEWallet > 0 ? `\n  └ 📱 E-Wallet        : *${formatRupiah(incomeEWallet - expenseEWallet)}*` : "") +
            `\n━━━━━━━━━━━━━━━━━━━━\n` +
            `📝 Total Transaksi : ${transactions.length}` +
            (categoryText ? `\n━━━━━━━━━━━━━━━━━━━━${categoryText}` : "");

          await sock.sendMessage(
            senderJid,
            { text: summaryText },
            { quoted: msg },
          );
        } catch (error) {
          console.error("Gagal mengambil rekap:", error);
          await sock.sendMessage(
            senderJid,
            { text: "❌ Terjadi kendala saat mengambil data rekap." },
            { quoted: msg },
          );
        }
        continue;
      }

      // ==========================================
      // 8. TRANSACTION RECORDING WITH QUOTA CHECK
      // ==========================================
      const parsed = parseWhatsAppMessage(trimmedText);
      if (!parsed) {
        continue;
      }

      try {
        // Check Membership Quota
        const quota = await checkUserQuota(user);
        if (!quota.isAllowed) {
          const quotaExceededMsg =
            `⛔ *KUOTA TRANSAKSI HABIS*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Penggunaan bulan ini: *${quota.used}/${quota.maxQuota} transaksi*.\n` +
            `Paket Anda saat ini: *${quota.plan}*\n\n` +
            `Transaksi *tidak dapat dicatat* karena telah mencapai batas kuota bulanan.\n\n` +
            `👉 Ketik *paket* untuk melihat info upgrade ke paket *PRO* atau *UNLIMITED*.\n` +
            `━━━━━━━━━━━━━━━━━━━━`;

          await sock.sendMessage(
            senderJid,
            { text: quotaExceededMsg },
            { quoted: msg },
          );
          continue;
        }

        // Determine category (reuse existing category or create shared global category)
        const categoryName = inferCategoryName(parsed.description, parsed.type);

        let category = await prisma.category.findFirst({
          where: {
            name: { equals: categoryName, mode: "insensitive" },
            type: parsed.type,
          },
          orderBy: [
            { userId: "asc" },
          ],
        });

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categoryName,
              type: parsed.type,
              userId: null,
            },
          });
        }

        // Save transaction with paymentMethod
        const transaction = await prisma.transaction.create({
          data: {
            amount: parsed.amount,
            description: parsed.description,
            type: parsed.type,
            paymentMethod: parsed.paymentMethod,
            userId: user.id,
            categoryId: category.id,
          },
        });

        // Auto-sync to Google Sheets if configured (asynchronous non-blocking)
        void syncTransactionToGoogleSheet(
          {
            id: transaction.id,
            amount: transaction.amount,
            description: transaction.description,
            type: transaction.type,
            paymentMethod: transaction.paymentMethod,
            date: transaction.date,
            category: { name: category.name },
          },
          user,
        );

        // Format and send reply receipt
        const isIncome = parsed.type === "INCOME";
        const icon = isIncome ? "💰" : "💸";
        const typeLabel = isIncome ? "Pemasukan (+)" : "Pengeluaran (-)";
        const paymentLabel = formatPaymentMethodLabel(transaction.paymentMethod);
        const newUsed = quota.used + 1;
        const quotaDisplay = quota.isUnlimited
          ? "∞"
          : `${newUsed}/${quota.maxQuota}`;

        const receiptMessage =
          `✅ *TRANSAKSI DICATAT*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          (isGroup ? `👤 Pengguna  : @${phoneNumber}\n` : "") +
          `📅 Waktu     : ${formatDateTime(transaction.date)}\n` +
          `📂 Kategori  : *${category.name}*\n` +
          `📝 Ket       : ${transaction.description}\n` +
          `${icon} Tipe      : *${typeLabel}*\n` +
          `💳 Metode    : *${paymentLabel}*\n` +
          `💵 Nominal   : *${formatRupiah(transaction.amount)}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📊 Kuota Bln : *${quotaDisplay}* (${quota.plan})\n` +
          `_Ketik *rekap* untuk saldo, atau *batal* untuk menghapus._`;

        await sock.sendMessage(
          senderJid,
          {
            text: receiptMessage,
            mentions: isGroup ? [`${phoneNumber}@s.whatsapp.net`] : undefined,
          },
          { quoted: msg }
        );
        console.log(
          `✅ Berhasil mencatat ${parsed.type} [${parsed.paymentMethod}] ${parsed.amount} untuk ${phoneNumber}${isGroup ? " [WA GROUP]" : ""}`
        );
      } catch (error) {
        console.error("Gagal mencatat transaksi WA:", error);
        await sock.sendMessage(
          senderJid,
          { text: "❌ Maaf, gagal mencatat transaksi. Coba lagi nanti." },
          { quoted: msg },
        );
      }
    }
  });
}

// Start the bot
startWhatsAppBot().catch((err) => {
  console.error("Fatal bot error:", err);
});

