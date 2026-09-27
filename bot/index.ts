import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import http from "http";
import pino from "pino";
import qrcode from "qrcode-terminal";
import path from "path";
import { prisma } from "../lib/prisma";
import { inferCategoryName } from "../lib/categorizer";
import {
  parseWhatsAppMessage,
  formatRupiah,
  formatDateTime,
} from "./parser";

const AUTH_DIR = path.join(process.cwd(), "bot_auth");

// State for web status and QR rendering
let latestQr: string | null = null;
let isConnected = false;
let botPhoneNumber = "";

/**
 * Lightweight HTTP server for Render health checks and Web QR code display
 */
const PORT = process.env.PORT || 3001;
const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url === "/health" || url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "ok",
        connected: isConnected,
        botNumber: botPhoneNumber || "Not connected yet",
        uptime: process.uptime(),
      })
    );
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
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .badge { background: #22c55e; color: #000; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ WhatsApp Bot Terhubung!</h1>
            <p><span class="badge">ONLINE</span></p>
            <p>Nomor Akun: <strong>${botPhoneNumber}</strong></p>
            <p>Bot siap menerima chat pencatatan keuangan 24/7.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (latestQr) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        latestQr
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
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h3>⏳ Menyiapkan sesi WhatsApp... Silakan tunggu beberapa detik.</h3>
      </body>
      </html>
    `);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP Server aktif di port ${PORT} (Health check & Web QR ready)`);
});

/**
 * Checks if a phone number is permitted based on ALLOWED_NUMBERS in .env
 */
function isPhoneNumberAllowed(rawNumber: string): boolean {
  const allowedEnv = process.env.ALLOWED_NUMBERS;
  if (!allowedEnv || allowedEnv.trim() === "" || allowedEnv.trim() === "*") {
    // Whitelist is not set or set to wildcard '*', all numbers allowed
    return true;
  }

  const cleanSender = rawNumber.replace(/\D/g, "");
  const allowedList = allowedEnv
    .split(",")
    .map((n) => n.trim().replace(/\D/g, ""))
    .filter(Boolean);

  return allowedList.some((allowed) => {
    if (cleanSender === allowed) return true;
    // Normalize Indonesian prefix: 08xx <-> 628xx
    if (allowed.startsWith("0") && cleanSender === "62" + allowed.slice(1)) return true;
    if (cleanSender.startsWith("0") && allowed === "62" + cleanSender.slice(1)) return true;
    return false;
  });
}

// Track recently processed message IDs to avoid duplicates
const processedMsgIds = new Set<string>();

async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`🤖 Menggunakan Baileys v${version.join(".")} (Latest: ${isLatest})`);

  const allowedConfig = process.env.ALLOWED_NUMBERS?.trim();
  if (allowedConfig && allowedConfig !== "*") {
    console.log(`🔒 Mode Whitelist AKTIF. Nomor yang diizinkan: ${allowedConfig}`);
  } else {
    console.log(`🌐 Mode Terbuka (Semua nomor diizinkan).`);
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: ["Bot Keuangan", "Chrome", "1.0.0"],
  });

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
      console.log("\nBuka WhatsApp -> Pengaturan / Titik Tiga -> Perangkat Tertaut -> Tautkan Perangkat\n");
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Koneksi terputus (status: ${statusCode}). Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        startWhatsAppBot();
      } else {
        console.log("❌ Sesi telah logout. Silakan jalankan bot kembali untuk scan QR baru.");
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
        // keep set memory small
        if (processedMsgIds.size > 2000) {
          const firstKey = processedMsgIds.values().next().value;
          if (firstKey) processedMsgIds.delete(firstKey);
        }
      }

      // Ignore broadcast or status updates
      if (msg.key.remoteJid?.endsWith("@broadcast")) {
        continue;
      }

      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;

      // Extract text content from various message types
      const textMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      const trimmedText = textMessage.trim();
      if (!trimmedText) continue;

      // Ignore bot's own automated response messages to prevent reply loops
      if (
        trimmedText.startsWith("🤖 *BOT PENCATAT KEUANGAN*") ||
        trimmedText.startsWith("✅ *TRANSAKSI DICATAT*") ||
        trimmedText.startsWith("📊 *REKAP KEUANGAN ANDA*") ||
        trimmedText.includes("Belum ada transaksi yang tercatat")
      ) {
        continue;
      }

      // Resolve phone number:
      // If user messages self ("Message yourself") or uses LID, resolve to the bot owner's actual phone number
      const botOwnerNumber = sock.user?.id?.split(":")[0]?.split("@")[0]?.replace(/\D/g, "") || "";
      let phoneNumber = senderJid.split("@")[0].split(":")[0].replace(/\D/g, "");

      if (msg.key.fromMe || senderJid.endsWith("@lid")) {
        if (botOwnerNumber) {
          phoneNumber = botOwnerNumber;
        }
      }

      const senderName = msg.pushName || `User ${phoneNumber.slice(-4)}`;

      // Check Whitelist
      if (!isPhoneNumberAllowed(phoneNumber)) {
        console.log(`⛔ Pesan diabaikan: ${phoneNumber} tidak terdaftar di whitelist.`);
        continue;
      }

      console.log(`📩 Pesan masuk dari ${senderName} (${phoneNumber}): "${trimmedText}"`);

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
          `*Perintah Lainnya:*\n` +
          `• \`rekap\` / \`laporan\` : Lihat ringkasan saldo & kategori\n` +
          `• \`bantuan\` : Tampilkan menu ini\n` +
          `━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(senderJid, { text: helpMessage }, { quoted: msg });
        continue;
      }

      // 2. Command: Rekapitulasi / Summary
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
              { quoted: msg }
            );
            continue;
          }

          const transactions = await prisma.transaction.findMany({
            where: { userId: user.id },
            include: { category: true },
          });

          let totalIncome = 0;
          let totalExpense = 0;
          const expenseCategoryMap: Record<string, { total: number; count: number }> = {};

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
            (a, b) => b[1].total - a[1].total
          );

          let categoryText = "";
          if (sortedCategories.length > 0) {
            categoryText = `\n📌 *Pengeluaran per Kategori:*\n` +
              sortedCategories
                .map(([name, stat]) => `• ${name}: *${formatRupiah(stat.total)}* (${stat.count}x)`)
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

          await sock.sendMessage(senderJid, { text: summaryText }, { quoted: msg });
        } catch (error) {
          console.error("Gagal mengambil rekap:", error);
          await sock.sendMessage(
            senderJid,
            { text: "❌ Terjadi kendala saat mengambil data rekap." },
            { quoted: msg }
          );
        }
        continue;
      }

      // 3. Parse Financial Transaction Message
      const parsed = parseWhatsAppMessage(trimmedText);
      if (!parsed) {
        // Not a recognized transaction format, don't spam if irrelevant
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

        // Format and send reply receipt
        const isIncome = parsed.type === "INCOME";
        const icon = isIncome ? "💰" : "💸";
        const typeLabel = isIncome ? "Pemasukan (+)" : "Pengeluaran (-)";

        const receiptMessage =
          `✅ *TRANSAKSI DICATAT*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📅 Waktu    : ${formatDateTime(transaction.date)}\n` +
          `📂 Kategori : *${category.name}*\n` +
          `📝 Ket      : ${transaction.description}\n` +
          `${icon} Tipe     : *${typeLabel}*\n` +
          `💵 Nominal  : *${formatRupiah(transaction.amount)}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `_Ketik *rekap* untuk melihat total saldo._`;

        await sock.sendMessage(senderJid, { text: receiptMessage }, { quoted: msg });
        console.log(`✅ Berhasil mencatat ${parsed.type} ${parsed.amount} untuk ${phoneNumber}`);
      } catch (error) {
        console.error("Gagal mencatat transaksi WA:", error);
        await sock.sendMessage(
          senderJid,
          { text: "❌ Maaf, gagal mencatat transaksi. Coba lagi nanti." },
          { quoted: msg }
        );
      }
    }
  });
}

// Start the bot
startWhatsAppBot().catch((err) => {
  console.error("Fatal bot error:", err);
});
