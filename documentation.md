# Personal Finance Tracker Backend Documentation

Dokumentasi arsitektur, skema database, API endpoints, sistem kategorisasi otomatis, rekapitulasi, serta panduan menjalankan WhatsApp Bot (Baileys) dan Flutter Mobile App.

---

## 1. Arsitektur & Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-device QR authentication)
- **Integrations Target**:
  - WhatsApp Bot (`bot/index.ts`)
  - Mobile App (Flutter)

---

## 2. Skema Database (Prisma)

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TransactionType {
  INCOME
  EXPENSE
}

model User {
  id           String        @id @default(uuid())
  phoneNumber  String        @unique
  name         String?
  createdAt    DateTime      @default(now())
  categories   Category[]
  transactions Transaction[]
}

model Category {
  id           String          @id @default(uuid())
  name         String
  type         TransactionType
  userId       String?
  user         User?           @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

model Transaction {
  id          String          @id @default(uuid())
  amount      Float
  description String
  type        TransactionType
  date        DateTime        @default(now())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  categoryId  String?
  category    Category?       @relation(fields: [categoryId], references: [id])
}
```

---

## 3. Sistem Auto-Categorization (Klasifikasi Otomatis)

Saat user mengirimkan transaksi dari WhatsApp atau Mobile App, sistem menentukan Kategori melalui 2 cara:

1. **Explicit Category**: Pengirim mengirimkan field `category` atau `categoryName` (contoh: `"Makanan"`, `"Kendaraan"`).
2. **Smart Auto-Categorization**: Jika kategori tidak dikirimkan, backend secara otomatis mendeteksi kata kunci dari deskripsi transaksi:
   - **Makanan & Minuman**: `sate`, `nasi`, `makan`, `ayam`, `bakso`, `kopi`, `cafe`, `teh`, `warung`, `resto`, `snack`, dll.
   - **Transportasi & Kendaraan**: `parkir`, `bensin`, `pertalite`, `pertamax`, `tol`, `gojek`, `grab`, `ojol`, `servis`, dll.
   - **Tagihan & Utilitas**: `listrik`, `pln`, `air`, `wifi`, `pulsa`, `kuota`, `sewa`, `kontrakan`, `kost`, dll.
   - **Belanja**: `belanja`, `baju`, `sepatu`, `supermarket`, `indomaret`, `alfamart`, `shopee`, `tokopedia`, dll.
   - **Kesehatan**: `obat`, `apotek`, `dokter`, `rumah sakit`, `vitamin`, dll.
   - **Gaji / Pemasukan**: `gaji`, `bonus`, `thr`, `freelance`, `proyek`, `dividen`, `cashback`, dll.

---

## 4. WhatsApp Bot Service (Baileys)

Bot WhatsApp berjalan mandiri via script `npm run bot` yang membaca pesan masuk secara real-time dan membalas langsung ke nomor pengirim.

### A. Cara Menjalankan Bot WhatsApp:

1. Jalankan perintah di terminal:
   ```bash
   npm run bot
   ```
2. Scan QR Code yang muncul di terminal menggunakan WhatsApp HP Anda:
   - Buka WhatsApp di HP
   - Klik **Titik Tiga** (Android) atau **Pengaturan** (iPhone)
   - Pilih **Perangkat Tertaut (Linked Devices)** $\rightarrow$ **Tautkan Perangkat**
   - Arahkan kamera HP ke QR Code terminal
3. Sesi login akan disimpan otomatis di folder `bot_auth/` (sehingga restart bot tidak perlu scan ulang).

### B. Format Chat yang Didukung:

| Tipe                | Contoh Pesan            | Hasil Klasifikasi & Aksi                                |
| ------------------- | ----------------------- | ------------------------------------------------------- |
| **Pengeluaran**     | `Parkir 2000`           | Kategori `Transportasi & Kendaraan`, Expense `Rp 2.000` |
| **Pengeluaran**     | `Beli sate ayam 50k`    | Kategori `Makanan & Minuman`, Expense `Rp 50.000`       |
| **Pengeluaran**     | `18rb Kopi susu`        | Kategori `Makanan & Minuman`, Expense `Rp 18.000`       |
| **Pemasukan (+)**   | `+5000000 Gaji bulanan` | Kategori `Gaji`, Income `Rp 5.000.000`                  |
| **Pemasukan (+)**   | `+ 1.5jt Proyek Web`    | Kategori `Freelance`, Income `Rp 1.500.000`             |
| **Rekap / Laporan** | `rekap` atau `laporan`  | Menampilkan total saldo & rincian per kategori          |
| **Bantuan**         | `bantuan` atau `help`   | Menampilkan panduan format chat                         |

### C. Contoh Struk Balasan Bot:

```text
✅ *TRANSAKSI DICATAT*
━━━━━━━━━━━━━━━━━━━━
📅 Waktu    : 27 Sep 2026, 21.49
📂 Kategori : *Makanan & Minuman*
📝 Ket      : Beli sate ayam
💸 Tipe     : *Pengeluaran (-)*
💵 Nominal  : *Rp 50.000*
━━━━━━━━━━━━━━━━━━━━
_Ketik *rekap* untuk melihat total saldo._
```

### D. Konfigurasi Whitelist Nomor HP (Keamanan):

Agar bot hanya memproses pesan dari nomor Anda (dan mengabaikan chat dari kontak lain / grup), atur di file `.env`:

```env
# Masukkan nomor WA yang diizinkan (format 628xxx atau 08xxx, pisahkan dengan koma jika lebih dari 1)
ALLOWED_NUMBERS="6281234567890,6289876543210"
```

- **Jika diisi**: Bot hanya akan merespon dan mencatat transaksi dari nomor yang terdaftar di whitelist. Pesan dari nomor lain akan diabaikan secara senyap tanpa mengganggu chat biasa.
- **Jika dikosongkan atau `*`**: Mode terbuka (semua nomor yang chat akan otomatis dicatat datanya secara terpisah per user).

---

## 5. API Endpoints

Base URL: `http://localhost:3000`

### A. `POST /api/transactions`

Mencatat transaksi baru (upsert user & create category).

```json
// Request Body:
{
  "phoneNumber": "6281234567890",
  "description": "Beli sate ayam",
  "amount": 50000,
  "type": "EXPENSE"
}
```

### B. `GET /api/transactions`

Mengambil riwayat transaksi terurut descending berdasarkan tanggal.

- Query params: `?phoneNumber=...`, `?category=...`, `?type=...`

### C. `GET /api/transactions/summary`

Mengambil rekap total saldo dan breakdown pengeluaran/pemasukan per kategori.

- Query params: `?phoneNumber=6281234567890`

### D. `GET /api/categories` & `POST /api/categories`

Mengambil atau membuat kategori transaksi.

---

## 6. Integrasi Flutter Mobile Apps

### Model Dart (`TransactionModel.dart`):

```dart
class TransactionModel {
  final String id;
  final double amount;
  final String description;
  final String type; // 'INCOME' | 'EXPENSE'
  final DateTime date;
  final String? categoryName;

  TransactionModel({
    required this.id,
    required this.amount,
    required this.description,
    required this.type,
    required this.date,
    this.categoryName,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    return TransactionModel(
      id: json['id'],
      amount: (json['amount'] as num).toDouble(),
      description: json['description'],
      type: json['type'],
      date: DateTime.parse(json['date']),
      categoryName: json['category'] != null ? json['category']['name'] : 'Tanpa Kategori',
    );
  }
}
```

---

## 7. Cara Menjalankan Project

1. **Jalankan Next.js Web/API Server**:

   ```bash
   npm run dev
   ```

2. **Jalankan Bot WhatsApp di terminal terpisah**:
   ```bash
   npm run bot
   ```
   17Agustus!!
