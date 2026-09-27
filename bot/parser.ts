export interface ParsedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  paymentMethod: "CASH" | "BANK" | "E_WALLET";
}

/**
 * Infer Payment Method from description/keywords
 */
export function inferPaymentMethod(
  text: string,
  type: "INCOME" | "EXPENSE" = "EXPENSE"
): "CASH" | "BANK" | "E_WALLET" {
  const lower = text.toLowerCase();

  // E-Wallet detection
  if (/(gopay|go-pay|ovo|dana|shopeepay|shopee\s*pay|linkaja|link\s*aja|qris|e-?wallet)/i.test(lower)) {
    return "E_WALLET";
  }

  // Bank & Transfer detection
  if (
    /(bank|bca|mandiri|bri|bni|cimb|jago|jenius|seabank|permata|bsi|tf|transfer|debit|rekening|atm|m-?banking|mbanking)/i.test(
      lower
    )
  ) {
    return "BANK";
  }

  // Cash / Tunai detection
  if (/(cash|tunai|kontan|uang\s*pas|dompet)/i.test(lower)) {
    return "CASH";
  }

  // For Income, default salary/invoices usually go to Bank
  if (type === "INCOME" && /(gaji|salary|omset|omzet|penjualan|invoice|klien|client|proyek|project)/i.test(lower)) {
    return "BANK";
  }

  return "CASH";
}

/**
 * Normalizes number formats like 50k, 50rb, 1.5jt, 20.000
 */
export function normalizeAmount(raw: string): number | null {
  const str = raw.trim().toLowerCase().replace(/\s+/g, "");

  if (str.endsWith("jt") || str.endsWith("juta")) {
    const num = parseFloat(str.replace(/(jt|juta)/g, "").replace(/,/g, "."));
    return isNaN(num) ? null : Math.round(num * 1_000_000);
  }

  if (str.endsWith("k") || str.endsWith("rb") || str.endsWith("ribu")) {
    const num = parseFloat(str.replace(/(k|rb|ribu)/g, "").replace(/,/g, "."));
    return isNaN(num) ? null : Math.round(num * 1_000);
  }

  // standard numbers e.g. 50000 or 50.000
  const cleanNum = str.replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(cleanNum);
  return isNaN(num) ? null : num;
}

/**
 * Parses user chat text into a structured financial transaction
 */
export function parseWhatsAppMessage(message: string): ParsedTransaction | null {
  const clean = message.trim();
  if (!clean) return null;

  // 1. Income with leading '+' (e.g. "+50000 Gaji", "+ 50k Freelance via BCA", "+1000000")
  if (clean.startsWith("+")) {
    const withoutPlus = clean.substring(1).trim();
    // Pattern: "+50000 Gaji" or "+Gaji 50000"
    const amountFirst = withoutPlus.match(/^(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)\s*(.*)$/i);
    if (amountFirst) {
      const amount = normalizeAmount(amountFirst[1]);
      if (amount && amount > 0) {
        const description = amountFirst[2].trim() || "Pemasukan";
        const paymentMethod = inferPaymentMethod(description, "INCOME");
        return { type: "INCOME", amount, description, paymentMethod };
      }
    }

    const descFirst = withoutPlus.match(/^(.*?)\s+(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)$/i);
    if (descFirst) {
      const amount = normalizeAmount(descFirst[2]);
      if (amount && amount > 0) {
        const description = descFirst[1].trim() || "Pemasukan";
        const paymentMethod = inferPaymentMethod(description, "INCOME");
        return { type: "INCOME", amount, description, paymentMethod };
      }
    }
  }

  // 2. Expense Pattern: "Deskripsi Nominal" (e.g. "Parkir mall 2000", "Beli sate ayam 50k via BCA", "Kopi 25rb tf")
  const descThenAmount = clean.match(/^(.*?)\s+(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)$/i);
  if (descThenAmount) {
    const amount = normalizeAmount(descThenAmount[2]);
    if (amount && amount > 0) {
      const description = descThenAmount[1].trim();
      if (description) {
        const paymentMethod = inferPaymentMethod(description, "EXPENSE");
        return { type: "EXPENSE", amount, description, paymentMethod };
      }
    }
  }

  // 3. Expense Pattern: "Nominal Deskripsi" (e.g. "2000 Parkir", "50k Beli sate cash")
  const amountThenDesc = clean.match(/^(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)\s+(.*)$/i);
  if (amountThenDesc) {
    const amount = normalizeAmount(amountThenDesc[1]);
    if (amount && amount > 0) {
      const description = amountThenDesc[2].trim();
      if (description) {
        const paymentMethod = inferPaymentMethod(description, "EXPENSE");
        return { type: "EXPENSE", amount, description, paymentMethod };
      }
    }
  }

  return null;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
