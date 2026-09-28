/**
 * PingKas - Google Sheets Auto-Sync & Spreadsheet Export Utility
 */

export interface SheetTransactionPayload {
  id: string;
  date: string;
  time: string;
  phoneNumber: string;
  userName: string;
  description: string;
  type: "PENGELUARAN" | "PEMASUKAN";
  paymentMethod: string; // "Tunai (Cash)" | "Bank / Transfer" | "E-Wallet"
  category: string;
  amount: number;
  signedAmount: number;
  sheetName: string; // Tab sheet bulanan, contoh: "September 2026"
  rawDate: Date;
}

/**
 * Standard Google Apps Script code template that users can copy into Google Sheets Extensions -> Apps Script
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * PingKas Google Sheets Auto-Sync Webhook Script (Multi-Tab Bulanan Otomatis + Kolom Pembayaran)
 * 1. Buka Google Spreadsheet
 * 2. Klik Extensions (Ekstensi) > Apps Script
 * 3. Hapus semua kode dan Paste seluruh kode ini
 * 4. Klik Deploy > New Deployment > Select Type: Web App
 * 5. Set 'Execute as': Me, dan 'Who has access': Anyone
 * 6. Klik Deploy, Authorize Access, dan salin Web App URL ke PingKas!
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    // Tentukan nama tab sheet per bulan (contoh: "September 2026")
    var sheetName = data.sheetName || (function() {
      var months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      var now = new Date();
      return months[now.getMonth()] + " " + now.getFullYear();
    })();

    // Cari tab sheet bulan terkait, jika belum ada, buat tab baru secara otomatis!
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Inisialisasi Header Oranye PingKas jika tab masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "ID Transaksi",
        "Tanggal",
        "Jam",
        "No WhatsApp",
        "Nama",
        "Tipe",
        "Pembayaran",
        "Kategori",
        "Deskripsi",
        "Nominal (Rp)",
        "Nominal (+/-)"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#FF6D00").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    
    // Append baris transaksi baru ke tab bulan terkait
    sheet.appendRow([
      data.id || "TRX-" + new Date().getTime(),
      data.date,
      data.time,
      "'" + data.phoneNumber,
      data.userName || "-",
      data.type,
      data.paymentMethod || "Tunai (Cash)",
      data.category || "Umum",
      data.description,
      data.amount,
      data.signedAmount
    ]);
    
    // Format kolom nominal (kolom 10 & 11) ke format Rupiah
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 10, 1, 2).setNumberFormat('"Rp"#,##0');
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Transaksi berhasil dicatat ke tab sheet " + sheetName,
        sheet: sheetName,
        row: lastRow
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "PingKas Sheets Webhook Active", timestamp: new Date() })
  ).setMimeType(ContentService.MimeType.JSON);
}
`;

export function formatPaymentMethodLabel(method?: string | null): string {
  if (!method) return "Tunai (Cash)";
  const upper = method.toUpperCase();
  if (upper === "BANK" || upper.includes("BANK") || upper.includes("TRANSFER")) return "Bank / Transfer";
  if (upper === "E_WALLET" || upper === "EWALLET" || upper.includes("WALLET") || upper.includes("QRIS")) return "E-Wallet";
  return "Tunai (Cash)";
}

/**
 * Asynchronously syncs a transaction to Google Sheets
 */
export async function syncTransactionToGoogleSheet(
  transaction: {
    id: string;
    amount: number;
    description: string;
    type: "EXPENSE" | "INCOME";
    paymentMethod?: string | null;
    date: Date;
    category?: { name: string } | null;
  },
  user: {
    phoneNumber: string;
    name?: string | null;
    sheetWebhookUrl?: string | null;
    autoSyncSheet?: boolean;
  }
) {
  const targetWebhookUrl =
    user.sheetWebhookUrl ||
    (user.autoSyncSheet ? process.env.GOOGLE_SHEET_WEBHOOK_URL : null);

  if (!targetWebhookUrl) {
    return { synced: false, reason: "No webhook URL configured" };
  }

  try {
    const d = new Date(transaction.date);
    const dateFormatted = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const timeFormatted = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
    // Format nama sheet tab bulanan: "September 2026"
    const sheetNameFormatted = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    const isExpense = transaction.type === "EXPENSE";
    const payload: SheetTransactionPayload = {
      id: transaction.id,
      date: dateFormatted,
      time: timeFormatted,
      phoneNumber: user.phoneNumber,
      userName: user.name || `User ${user.phoneNumber.slice(-4)}`,
      description: transaction.description,
      type: isExpense ? "PENGELUARAN" : "PEMASUKAN",
      paymentMethod: formatPaymentMethodLabel(transaction.paymentMethod),
      category: transaction.category?.name || "Umum",
      amount: transaction.amount,
      signedAmount: isExpense ? -transaction.amount : transaction.amount,
      sheetName: sheetNameFormatted,
      rawDate: d,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(targetWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { synced: true, url: targetWebhookUrl };
    } else {
      console.warn("Google Sheet sync failed with status:", res.status);
      return { synced: false, error: `HTTP ${res.status}` };
    }
  } catch (error) {
    console.error("Google Sheet webhook error:", error);
    return {
      synced: false,
      error: error instanceof Error ? error.message : "Sync timeout / failed",
    };
  }
}

/**
 * Generates formatted CSV content for export with UTF-8 BOM for Microsoft Excel & Google Sheets
 */
export function generateSpreadsheetCsv(
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    type: "EXPENSE" | "INCOME";
    paymentMethod?: string | null;
    date: Date | string;
    user?: { phoneNumber: string; name?: string | null } | null;
    category?: { name: string } | null;
  }>,
  title = "Rekap Transaksi PingKas",
  initialBalance = 0
): string {
  // UTF-8 BOM so Excel opens accented & Indonesian characters cleanly
  const BOM = "\uFEFF";

  const rows: string[] = [];

  rows.push(`sep=,`);
  rows.push(`"${title}"`);
  rows.push(`"Tanggal Unduh","${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}"`);
  rows.push(`"Saldo Awal",${initialBalance}`);
  rows.push(`"Total Transaksi","${transactions.length}"`);
  rows.push("");

  // Table Headers
  rows.push(
    `"No","ID Transaksi","Tanggal","Jam","No WhatsApp","Nama Pengguna","Jenis","Pembayaran","Kategori","Deskripsi","Nominal (Rp)","Saldo (+/-)"`
  );

  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t, idx) => {
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const timeStr = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const isExpense = t.type === "EXPENSE";
    if (isExpense) totalExpense += t.amount;
    else totalIncome += t.amount;

    const cleanDesc = (t.description || "").replace(/"/g, '""');
    const cleanCat = (t.category?.name || "Umum").replace(/"/g, '""');
    const cleanName = (t.user?.name || "").replace(/"/g, '""');
    const phone = t.user?.phoneNumber || "";
    const payment = formatPaymentMethodLabel(t.paymentMethod);

    const signed = isExpense ? -t.amount : t.amount;

    rows.push(
      `"${idx + 1}","${t.id}","${dateStr}","${timeStr}","'${phone}","${cleanName}","${
        isExpense ? "PENGELUARAN" : "PEMASUKAN"
      }","${payment}","${cleanCat}","${cleanDesc}",${t.amount},${signed}`
    );
  });

  const netBalance = totalIncome - totalExpense;
  const finalBalance = initialBalance + netBalance;

  rows.push("");
  rows.push(`"","","","","","","","","","SALDO AWAL",${initialBalance},""`);
  rows.push(`"","","","","","","","","","TOTAL PEMASUKAN",${totalIncome},""`);
  rows.push(`"","","","","","","","","","TOTAL PENGELUARAN",${totalExpense},""`);
  rows.push(`"","","","","","","","","","MUTASI BERSIH (NET)",${netBalance},""`);
  rows.push(`"","","","","","","","","","SALDO AKHIR",${finalBalance},""`);

  return BOM + rows.join("\r\n");
}
