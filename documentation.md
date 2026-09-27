# Personal Finance Tracker Backend Documentation

Dokumentasi arsitektur, skema database, API endpoints, sistem kategorisasi otomatis, rekapitulasi, serta panduan integrasi untuk bot WhatsApp (Baileys / whatsapp-web.js) dan Flutter Mobile App.

---

## 1. Arsitektur & Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL
- **Integrations Target**: 
  - WhatsApp Bot (Baileys / whatsapp-web.js)
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

Saat user mengirimkan transaksi dari WhatsApp atau Mobile App, sistem memiliki 2 cara menentukan Kategori:

1. **Explicit Category**: Pengirim mengirimkan field `category` atau `categoryName` (contoh: `"Makanan"`, `"Kendaraan"`).
2. **Smart Auto-Categorization**: Jika kategori tidak dikirimkan, backend secara otomatis mendeteksi kata kunci dari deskripsi transaksi:
   - **Makanan & Minuman**: `sate`, `nasi`, `makan`, `ayam`, `bakso`, `kopi`, `cafe`, `teh`, `warung`, `resto`, `snack`, dll.
   - **Transportasi & Kendaraan**: `parkir`, `bensin`, `pertalite`, `pertamax`, `tol`, `gojek`, `grab`, `ojol`, `servis`, dll.
   - **Tagihan & Utilitas**: `listrik`, `pln`, `air`, `wifi`, `pulsa`, `kuota`, `sewa`, `kontrakan`, `kost`, dll.
   - **Belanja**: `belanja`, `baju`, `sepatu`, `supermarket`, `indomaret`, `alfamart`, `shopee`, `tokopedia`, dll.
   - **Kesehatan**: `obat`, `apotek`, `dokter`, `rumah sakit`, `vitamin`, dll.
   - **Gaji / Pemasukan**: `gaji`, `bonus`, `thr`, `freelance`, `proyek`, `dividen`, `cashback`, dll.

> **Note**: Kategori yang terdeteksi otomatis akan disimpan ke tabel `Category` milik user yang bersangkutan jika belum ada, lalu dihubungkan langsung (`categoryId`) ke data `Transaction`.

---

## 4. API Endpoints

Base URL: `http://localhost:3000` (atau domain production)

### A. `POST /api/transactions`
Mencatat transaksi baru. Endpoint ini secara otomatis melakukan **upsert User** dan **resolve/create Category**.

#### Request Body:
| Field | Type | Required | Deskripsi |
|---|---|---|---|
| `phoneNumber` | `string` | Ya | Nomor WhatsApp / HP user (e.g. `"6281234567890"`) |
| `description` | `string` | Ya | Keterangan transaksi (e.g. `"Beli sate ayam"`, `"Parkir mall"`) |
| `amount` | `number` | Ya | Jumlah nominal (harus angka positif > 0) |
| `type` | `string` | Ya | Enum: `"EXPENSE"` atau `"INCOME"` |
| `category` | `string` | Tidak | Nama kategori kustom (opsional, auto-inferred jika kosong) |
| `categoryId` | `string` | Tidak | UUID Kategori yang sudah ada (opsional) |

#### Contoh Request:
```json
{
  "phoneNumber": "6281234567890",
  "description": "Beli sate ayam",
  "amount": 50000,
  "type": "EXPENSE"
}
```

#### Contoh Response Success (`200 OK`):
```json
{
  "success": true,
  "message": "Transaction recorded",
  "data": {
    "id": "07d310e8-4767-4b0d-9ecc-407ab50eaf2c",
    "amount": 50000,
    "description": "Beli sate ayam",
    "type": "EXPENSE",
    "date": "2026-09-27T14:49:12.003Z",
    "userId": "4375a054-7a81-4b55-96f0-2ccebeb500c9",
    "categoryId": "8a20e39c-1532-47d8-898d-af1c435f4646",
    "user": {
      "id": "4375a054-7a81-4b55-96f0-2ccebeb500c9",
      "phoneNumber": "6281234567890",
      "name": "User 7890"
    },
    "category": {
      "id": "8a20e39c-1532-47d8-898d-af1c435f4646",
      "name": "Makanan & Minuman",
      "type": "EXPENSE"
    }
  }
}
```

---

### B. `GET /api/transactions`
Mengambil riwayat transaksi yang diurutkan secara **descending (terbaru ke terlama)** berdasarkan `date`.

#### Query Parameters:
- `phoneNumber` *(opsional)*: Filter berdasarkan nomor HP user.
- `category` *(opsional)*: Filter berdasarkan nama kategori (contoh: `?category=Makanan %26 Minuman`).
- `categoryId` *(opsional)*: Filter berdasarkan UUID kategori.
- `type` *(opsional)*: Filter `INCOME` atau `EXPENSE`.

---

### C. `GET /api/transactions/summary`
Mengambil rekapitulasi keuangan, saldo total, dan **breakdown pengeluaran/pemasukan per kategori**.

#### Query Parameters:
- `phoneNumber` *(opsional)*: Filter rekap untuk nomor HP tertentu.

#### Contoh Request:
```bash
curl "http://localhost:3000/api/transactions/summary?phoneNumber=6281234567890"
```

#### Contoh Response:
```json
{
  "success": true,
  "summary": {
    "totalIncome": 8000000,
    "totalExpense": 70000,
    "balance": 7930000,
    "transactionCount": 3
  },
  "expenseByCategory": [
    {
      "categoryId": "8a20e39c-1532-47d8-898d-af1c435f4646",
      "name": "Makanan & Minuman",
      "type": "EXPENSE",
      "total": 68000,
      "count": 2
    },
    {
      "categoryId": "30bdfa0e-22bf-4ad3-8f86-dfe11e72ffbf",
      "name": "Transportasi & Kendaraan",
      "type": "EXPENSE",
      "total": 2000,
      "count": 1
    }
  ],
  "incomeByCategory": [
    {
      "categoryId": "3d719489-d6d5-4001-bc8a-6d0b03180a4f",
      "name": "Gaji",
      "type": "INCOME",
      "total": 8000000,
      "count": 1
    }
  ]
}
```

---

### D. `GET /api/categories` & `POST /api/categories`
- `GET /api/categories?phoneNumber=...`: Menampilkan daftar semua kategori.
- `POST /api/categories`: Menambahkan kategori kustom baru.

---

## 5. Panduan Integrasi WhatsApp Bot (Baileys / whatsapp-web.js)

### Flow Chat WA ke Bot:
1. User kirim pesan `Beli sate 50000` via WhatsApp.
2. Bot mengirimkan request ke `POST /api/transactions`.
3. Backend mengidentifikasi kategori `Makanan & Minuman` dan menyimpan ke database.
4. Bot membalas pesan dengan struk rapi:
   ```text
   ✅ *Transaksi Berhasil Dicatat*
   ━━━━━━━━━━━━━━━━━━━━
   📅 Tanggal : 27/09/2026 21:49
   📂 Kategori: Makanan & Minuman
   📝 Ket     : Beli sate ayam
   💰 Nominal : Rp 50.000
   ━━━━━━━━━━━━━━━━━━━━
   ```

5. Jika user mengetik `rekap` atau `laporan`:
   Bot memanggil `GET /api/transactions/summary?phoneNumber=...` dan membalas:
   ```text
   📊 *Rekapitulasi Keuangan Anda*
   ━━━━━━━━━━━━━━━━━━━━
   💵 Total Pemasukan   : Rp 8.000.000
   💸 Total Pengeluaran : Rp 70.000
   💳 Sisa Saldo        : Rp 7.930.000

   📌 *Pengeluaran per Kategori:*
   • Makanan & Minuman : Rp 68.000 (2x)
   • Transportasi      : Rp 2.000 (1x)
   ━━━━━━━━━━━━━━━━━━━━
   ```

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

## 7. Setup & Menjalankan Project

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Konfigurasi Environment Variable (`.env`)**:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/finance_db?schema=public"
   ```

3. **Sinkronisasi Skema Database & Generate Prisma Client**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
