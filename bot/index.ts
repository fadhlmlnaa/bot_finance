import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
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
      console.clear();
      console.log("\n=======================================================");
      console.log("📲 SCAN QR CODE DI BAWAH MENGGUNAKAN WHATSAPP DI HP:");
      console.log("=======================================================\n");
      qrcode.generate(qr, { small: true });
      console.log("\nBuka WhatsApp -> Pengaturan / Titik Tiga -> Perangkat Tertaut -> Tautkan Perangkat\n");
    }

    if (connection === "close") {
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
      console.log("\n✅ WHATSAPP BOT BERHASIL TERHUBUNG!");
      console.log("🚀 Siap menerima pesan pencatatan keuangan.\n");
    }
  });

  // Save auth credentials whenever updated
  sock.ev.on("creds.update", saveCreds);

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      // Ignore broadcast/status updates
      if (!msg.message || msg.key.remoteJid?.endsWith("@broadcast")) {
        continue;
      }

      // Handle both incoming chats and "Message Yourself" (fromMe)
      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;

      // Extract phone number from JID (e.g., 6281234567890@s.whatsapp.net -> 6281234567890)
      const phoneNumber = senderJid.split("@")[0].split(":")[0].replace(/\D/g, "");
      const senderName = msg.pushName || `User ${phoneNumber.slice(-4)}`;

      // Check Whitelist
      if (!isPhoneNumberAllowed(phoneNumber)) {
        // Silently ignore messages from non-whitelisted numbers so it doesn't disturb normal chats
        continue;
      }

      // Extract text content from various message types
      const textMessage =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      const trimmedText = textMessage.trim();
      if (!trimmedText) continue;

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
        // Not a recognized transaction format, don't spam if irrelevant or in group
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
