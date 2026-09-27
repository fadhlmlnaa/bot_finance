import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState as getMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
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
import { parseWhatsAppMessage, formatRupiah, formatDateTime } from "./parser";
import { syncTransactionToGoogleSheet } from "../lib/sheets";


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

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: ["Bot Keuangan", "Chrome", "1.0.0"],
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
        trimmedText.includes("Belum ada transaksi yang tercatat")
      ) {
        continue;
      }

      const isGroup = senderJid.endsWith("@g.us");
      const botOwnerNumber =
        sock.user?.id?.split(":")[0]?.split("@")[0]?.replace(/\D/g, "") || "";

      let phoneNumber = "";
      if (isGroup) {
        // Di grup, pengirim transaksi adalah participant yang mengirim pesan
        const participantJid =
          msg.key.participant || (msg as unknown as { participant?: string })?.participant || "";
        phoneNumber = participantJid.split("@")[0].split(":")[0].replace(/\D/g, "");
      } else {
        phoneNumber = senderJid
          .split("@")[0]
          .split(":")[0]
          .replace(/\D/g, "");
      }

      if (msg.key.fromMe || senderJid.endsWith("@lid")) {
        if (botOwnerNumber) {
          phoneNumber = botOwnerNumber;
        }
      }

      if (!phoneNumber) continue;

      // Filter pesan di Grup WhatsApp: Hanya respon jika Bot di-TAG / MENTION atau direply
      let processedText = trimmedText;
      if (isGroup) {
        const mentionedJids: string[] =
          msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedParticipant: string =
          msg.message.extendedTextMessage?.contextInfo?.participant || "";

        const isMentioned = mentionedJids.some(
          (jid) =>
            (botPhoneNumber && jid.includes(botPhoneNumber)) ||
            (botOwnerNumber && jid.includes(botOwnerNumber))
        );
        const isQuoted =
          (botPhoneNumber && quotedParticipant.includes(botPhoneNumber)) ||
          (botOwnerNumber && quotedParticipant.includes(botOwnerNumber));
        const hasKeyword = new RegExp(
          `@${botPhoneNumber}|@pingkas|@bot`,
          "i"
        ).test(trimmedText);

        if (!isMentioned && !isQuoted && !hasKeyword) {
          // Abaikan obrolan umum grup agar bot tidak spam
          continue;
        }

        // Bersihkan mention tag @nomor / @bot dari teks transaksi
        processedText = trimmedText
          .replace(new RegExp(`@${botPhoneNumber}|@\\d{8,16}|@bot|@pingkas`, "gi"), "")
          .trim();

        if (!processedText) {
          // Jika user hanya tag @bot tanpa pesan, kirim panduan singkat
          await sock.sendMessage(
            senderJid,
            {
              text: `👋 Halo @${phoneNumber}! Tag saya bersama catatan keuangan Anda.\n\n*Contoh Penggunaan di Grup:*\n• \`@PingKas Makan siang 25rb\`\n• \`@PingKas Gaji 5jt\`\n• \`@PingKas rekap\`\n• \`@PingKas bantuan\``,
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
      // USER COMMANDS
      // ==========================================

      // 1. Command: Help / Bantuan
      if (/^(help|bantuan|menu|info)$/i.test(trimmedText)) {
        const helpMessage =
          `🤖 *BOT PENCATAT KEUANGAN*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `*Cara Mencatat Pengeluaran:*\n` +
          `• \`Parkir 2000\`\n` +
          `• \`Beli sate ayam 50k\`\n` +
          `• \`18000 Kopi susu\`\n\n` +
          `*Cara Mencatat Pemasukan (+):*\n` +
          `• \`+5000000 Gaji bulanan\`\n` +
          `• \`+50k Bonus project\`\n\n` +
          `*Perintah Fitur & Membership:*\n` +
          `• \`rekap\` : Lihat ringkasan saldo & kategori\n` +
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

      // 2. Command: Info Paket / Upgrade
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

      // 3. Command: Status & Sisa Kuota
      if (/^(status|kuota|membership|akun)$/i.test(trimmedText)) {
        try {
          const user = await prisma.user.upsert({
            where: { phoneNumber },
            update: { name: senderName },
            create: { phoneNumber, name: senderName },
          });

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

      // 4. Command: Auto-sync Google Sheets (!setsheet <url>)
      if (trimmedText.startsWith("!setsheet") || trimmedText.startsWith("!sheet")) {
        const parts = trimmedText.split(/\s+/);
        if (parts.length < 2) {
          await sock.sendMessage(
            senderJid,
            {
              text:
                `📊 *PANDUAN AUTO-SYNC GOOGLE SHEETS*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `Format: \`!setsheet <URL_Web_App_Google_Apps_Script>\`\n\n` +
                `*Contoh:*\n` +
                `\`!setsheet https://script.google.com/macros/s/.../exec\`\n\n` +
                `_Ketik \`!setsheet off\` untuk menonaktifkan sync._`,
            },
            { quoted: msg },
          );
          continue;
        }

        const rawUrl = parts[1].trim();
        const isOff = rawUrl.toLowerCase() === "off" || rawUrl.toLowerCase() === "disable";

        await prisma.user.upsert({
          where: { phoneNumber },
          update: {
            sheetWebhookUrl: isOff ? null : rawUrl,
            autoSyncSheet: !isOff,
          },
          create: {
            phoneNumber,
            name: senderName,
            sheetWebhookUrl: isOff ? null : rawUrl,
            autoSyncSheet: !isOff,
          },
        });

        await sock.sendMessage(
          senderJid,
          {
            text: isOff
              ? `✅ Auto-sync ke Google Sheets telah dinonaktifkan.`
              : `✅ *Auto-sync Google Sheets Aktif!*\nSetiap transaksi baru Anda akan otomatis terkirim dan tercatat ke Google Spreadsheet Anda secara real-time.`,
          },
          { quoted: msg },
        );
        continue;
      }

      // 5. Command: Download Rekap Spreadsheet (rekap excel / export)
      if (
        /^(rekap\s*excel|rekap\s*spreadsheet|export|unduh\s*excel|download\s*rekap)$/i.test(
          trimmedText,
        )
      ) {
        const backendBase =
          process.env.NEXT_PUBLIC_APP_URL || "https://bot-finance-pi.vercel.app";
        const downloadUrl = `${backendBase}/api/transactions/export?phoneNumber=${phoneNumber}`;

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

      // 6. Command: Rekapitulasi / Summary
      if (/^(rekap|laporan|summary|saldo)$/i.test(trimmedText)) {
        try {
          const user = await prisma.user.findUnique({
            where: { phoneNumber },
          });

          if (!user) {
            await sock.sendMessage(
              senderJid,
              {
                text: "Belum ada transaksi yang tercatat untuk nomor Anda. Coba kirim pesan seperti: `Parkir 2000`",
              },
              { quoted: msg },
            );
            continue;
          }

          const transactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            include: { category: true },
          });

          let totalIncome = 0;
          let totalExpense = 0;
          const expenseCategoryMap: Record<
            string,
            { total: number; count: number }
          > = {};

          for (const t of transactions) {
            if (t.type === "INCOME") {
              totalIncome += t.amount;
            } else {
              totalExpense += t.amount;
              const catName = t.category?.name || "Lainnya";
              if (!expenseCategoryMap[catName]) {
                expenseCategoryMap[catName] = { total: 0, count: 0 };
              }
              expenseCategoryMap[catName].total += t.amount;
              expenseCategoryMap[catName].count += 1;
            }
          }

          const balance = totalIncome - totalExpense;
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
            `💵 Pemasukan : *${formatRupiah(totalIncome)}*\n` +
            `💸 Pengeluaran : *${formatRupiah(totalExpense)}*\n` +
            `💳 Sisa Saldo : *${formatRupiah(balance)}*\n` +
            `📝 Total Transaksi : ${transactions.length}\n` +
            `━━━━━━━━━━━━━━━━━━━━` +
            (categoryText ? `${categoryText}\n━━━━━━━━━━━━━━━━━━━━` : "");

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
      // 5. TRANSACTION RECORDING WITH QUOTA CHECK
      // ==========================================
      const parsed = parseWhatsAppMessage(trimmedText);
      if (!parsed) {
        continue;
      }

      try {
        // Upsert user
        const user = await prisma.user.upsert({
          where: { phoneNumber },
          update: { name: senderName },
          create: {
            phoneNumber,
            name: senderName,
          },
        });

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

        // Determine category
        const categoryName = inferCategoryName(parsed.description, parsed.type);

        let category = await prisma.category.findFirst({
          where: {
            name: { equals: categoryName, mode: "insensitive" },
            type: parsed.type,
            OR: [{ userId: user.id }, { userId: null }],
          },
        });

        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categoryName,
              type: parsed.type,
              userId: user.id,
            },
          });
        }

        // Save transaction
        const transaction = await prisma.transaction.create({
          data: {
            amount: parsed.amount,
            description: parsed.description,
            type: parsed.type,
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
            date: transaction.date,
            category: { name: category.name },
          },
          user,
        );

        // Format and send reply receipt
        const isIncome = parsed.type === "INCOME";
        const icon = isIncome ? "💰" : "💸";
        const typeLabel = isIncome ? "Pemasukan (+)" : "Pengeluaran (-)";
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
          `💵 Nominal   : *${formatRupiah(transaction.amount)}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📊 Kuota Bln : *${quotaDisplay}* (${quota.plan})\n` +
          `_Ketik *rekap* untuk melihat total saldo._`;

        await sock.sendMessage(
          senderJid,
          {
            text: receiptMessage,
            mentions: isGroup ? [`${phoneNumber}@s.whatsapp.net`] : undefined,
          },
          { quoted: msg }
        );
        console.log(
          `✅ Berhasil mencatat ${parsed.type} ${parsed.amount} untuk ${phoneNumber}${isGroup ? " [WA GROUP]" : ""}`
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
