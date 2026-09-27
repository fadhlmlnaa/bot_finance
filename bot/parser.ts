export interface ParsedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
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

  // 1. Income with leading '+' (e.g. "+50000 Gaji", "+ 50k Freelance", "+1000000")
  if (clean.startsWith("+")) {
    const withoutPlus = clean.substring(1).trim();
    // Pattern: "+50000 Gaji" or "+Gaji 50000"
    const amountFirst = withoutPlus.match(/^(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)\s*(.*)$/i);
    if (amountFirst) {
      const amount = normalizeAmount(amountFirst[1]);
      if (amount && amount > 0) {
        const description = amountFirst[2].trim() || "Pemasukan";
        return { type: "INCOME", amount, description };
      }
    }

    const descFirst = withoutPlus.match(/^(.*?)\s+(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)$/i);
    if (descFirst) {
      const amount = normalizeAmount(descFirst[2]);
      if (amount && amount > 0) {
        const description = descFirst[1].trim() || "Pemasukan";
        return { type: "INCOME", amount, description };
      }
    }
  }

  // 2. Expense Pattern: "Deskripsi Nominal" (e.g. "Parkir mall 2000", "Beli sate ayam 50k")
  const descThenAmount = clean.match(/^(.*?)\s+(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)$/i);
  if (descThenAmount) {
    const amount = normalizeAmount(descThenAmount[2]);
    if (amount && amount > 0) {
      const description = descThenAmount[1].trim();
      if (description) {
        return { type: "EXPENSE", amount, description };
      }
    }
  }

  // 3. Expense Pattern: "Nominal Deskripsi" (e.g. "2000 Parkir", "50k Beli sate")
  const amountThenDesc = clean.match(/^(\d+(?:[.,]\d+)?(?:k|rb|ribu|jt|juta)?)\s+(.*)$/i);
  if (amountThenDesc) {
    const amount = normalizeAmount(amountThenDesc[1]);
    if (amount && amount > 0) {
      const description = amountThenDesc[2].trim();
      if (description) {
        return { type: "EXPENSE", amount, description };
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
