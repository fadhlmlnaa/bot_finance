# PingKas - Personal Finance Tracker & WhatsApp Bot Engine Documentation

Dokumentasi komprehensif arsitektur sistem, skema database (Prisma & Supabase), API Autentikasi Flutter, Klasifikasi Metode Pembayaran (Bank, Cash, E-Wallet), Manajemen Saldo Awal (WhatsApp, Web, & Flutter), API Manajemen Kuota & Subscription Admin, Dashboard Analitik Direktur, Monitoring Kesehatan 3 Engine, Auto-Sync Multi-Tab Google Spreadsheet, Pencatatan Keuangan di WhatsApp Group, Pembatasan Akses Pengguna Terdaftar, serta Contoh Integrasi Lengkap Mobile Flutter (Dart).

---

## 1. Arsitektur & Tech Stack

- **Web & API Framework**: Next.js 16 (App Router, Turbopack, Tailwind CSS)
- **Language**: TypeScript & Dart (Flutter)
- **Database ORM**: Prisma ORM (v6)
- **Database Engine**: PostgreSQL (Supabase Connection Pooler)
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-device QR Authentication Worker)
- **Spreadsheet Sync Engine**: Asynchronous Webhook ke Google Apps Script (Multi-Tab Bulanan + Kolom Pembayaran)
- **Deployment**: Next.js Web/API (Vercel) + WA Bot Worker (Render / Docker)

---

## 2. Skema Database (Prisma)

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum TransactionType {
  INCOME
  EXPENSE
}

enum PaymentMethod {
  CASH       // Tunai / Kas Fisik
  BANK       // Rekening Bank / Transfer / Debit / ATM
  E_WALLET   // Gopay / OVO / Dana / QRIS / ShopeePay
}

enum SubscriptionPlan {
  FREE
  PRO
  UNLIMITED
}

model User {
  id                 String           @id @default(uuid())
  phoneNumber        String           @unique
  name               String?
  createdAt          DateTime         @default(now())

  // Membership & Admin Role
  plan               SubscriptionPlan @default(FREE)
  subscriptionEnd    DateTime?
  monthlyQuota       Int              @default(20) // Maksimal transaksi per bulan
  isAdmin            Boolean          @default(false) // Penentu akses menu Admin di Flutter/Web

  // Saldo Awal (Initial Balance)
  initialBalance     Float            @default(0) // Total Saldo Awal
  initialBankBalance Float            @default(0) // Saldo Awal Bank / Rekening
  initialCashBalance Float            @default(0) // Saldo Awal Kas Tunai

  // Google Sheets Auto-Sync
  sheetWebhookUrl    String?          // Webhook Apps Script milik pengguna
  autoSyncSheet      Boolean          @default(false)

  categories         Category[]
  transactions       Transaction[]
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
  id            String          @id @default(uuid())
  amount        Float
  description   String
  type          TransactionType
  paymentMethod PaymentMethod   @default(CASH)
  date          DateTime        @default(now())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  categoryId    String?
  category      Category?       @relation(fields: [categoryId], references: [id])
}
```

---

## 3. API Autentikasi Login Flutter & Web (`POST /api/auth/login`)

Digunakan oleh aplikasi Flutter dan Web Portal untuk login/register menggunakan nomor telepon. Mengembalikan profil lengkap, status `isAdmin`, saldo awal, URL Webhook Spreadsheet, serta sisa kuota transaksi bulan berjalan.

### Request:
- **URL**: `POST /api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "phoneNumber": "085280357817",
  "name": "Fadhil Maulana"
}
```

### Response Success (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJ1c2VySWQiOiI0Mzc1YTA1NC0...",
    "user": {
      "id": "4375a054-7a81-4b55-96f0-2ccebeb500c9",
      "phoneNumber": "6285280357817",
      "name": "Fadhil Maulana",
      "isAdmin": true,
      "plan": "PRO",
      "monthlyQuota": 200,
      "subscriptionEnd": "2026-10-27T23:00:00.000Z",
      "initialBalance": 1000000,
      "initialBankBalance": 750000,
      "initialCashBalance": 250000,
      "sheetWebhookUrl": "https://script.google.com/macros/s/.../exec",
      "autoSyncSheet": true,
      "createdAt": "2026-09-27T14:41:17.212Z"
    },
    "quota": {
      "used": 4,
      "maxQuota": 200,
      "remaining": 196,
      "isAllowed": true,
      "isUnlimited": false,
      "expiresAt": "2026-10-27T23:00:00.000Z"
    }
  }
}
```

---

## 4. API Saldo Awal (Initial Balance)

Pengguna dapat mengatur saldo awal bank dan tunai baik lewat WhatsApp bot (`!setsaldo`), Web Portal, maupun aplikasi Flutter.

### A. Ambil Saldo Awal (`GET /api/user/initial-balance`)
- **URL**: `GET /api/user/initial-balance?phoneNumber=085280357817`
- **Response Success (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "phoneNumber": "6285280357817",
    "name": "Fadhil Maulana",
    "initialBalance": 1000000,
    "initialBankBalance": 700000,
    "initialCashBalance": 300000
  }
}
```

### B. Simpan / Perbarui Saldo Awal (`POST /api/user/initial-balance`)
- **URL**: `POST /api/user/initial-balance`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "phoneNumber": "085280357817",
  "initialBankBalance": 750000,
  "initialCashBalance": 250000
}
```
*Catatan: Jika hanya mengirim `initialBalance`, sistem otomatis menyimpannya sebagai total saldo awal.*

---

## 5. API Transaksi & Klasifikasi Pembayaran

### A. Catat Transaksi Baru (`POST /api/transactions`)
- **URL**: `POST /api/transactions`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "phoneNumber": "085280357817",
  "amount": 45000,
  "description": "Beli makan siang nasi kapau",
  "type": "EXPENSE",
  "paymentMethod": "CASH",
  "categoryName": "Makanan & Minuman"
}
```

*Nilai `paymentMethod`: `CASH` (Tunai), `BANK` (Bank / Transfer), `E_WALLET` (E-Wallet / QRIS).*

### B. Ambil Ringkasan & Rekapitulasi (`GET /api/transactions/summary`)
- **URL**: `GET /api/transactions/summary?phoneNumber=085280357817&month=9&year=2026`
- **Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "initialBalance": 1000000,
      "initialBankBalance": 700000,
      "initialCashBalance": 300000,
      "totalIncome": 5000000,
      "totalExpense": 1500000,
      "netBalance": 3500000,
      "finalBalance": 4500000,
      "transactionCount": 18
    },
    "paymentBreakdown": {
      "bank": {
        "initial": 700000,
        "income": 5000000,
        "expense": 800000,
        "current": 4900000
      },
      "cash": {
        "initial": 300000,
        "income": 0,
        "expense": 700000,
        "current": -400000
      },
      "eWallet": {
        "income": 0,
        "expense": 0,
        "current": 0
      }
    },
    "byCategory": [
      { "name": "Makanan & Minuman", "type": "EXPENSE", "total": 650000, "count": 10 }
    ]
  }
}
```

---

## 6. Auto-Sync Multi-Tab Google Spreadsheet & Ekspor CSV

### A. Template Google Apps Script (`Code.gs`)
Salin kode berikut ke Google Spreadsheet di menu **Ekstensi (Extensions)** > **Apps Script**, lalu klik **Deploy** > **New deployment** > **Web app** (*Who has access: Anyone*):

```javascript
/**
 * PINGKAS - Google Apps Script Webhook Listener (Multi-Tab Bulanan + Kolom Pembayaran)
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // 1. Tentukan nama tab sheet per bulan (contoh: "September 2026")
    var sheetName =
      data.sheetName ||
      (function () {
        var months = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember",
        ];
        var now = new Date();
        return months[now.getMonth()] + " " + now.getFullYear();
      })();

    // 2. Cari tab sheet bulan terkait, buat baru jika belum ada
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // 3. Inisialisasi Header Oranye PingKas jika tab masih kosong
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
        "Nominal (+/-)",
      ]);
      sheet
        .getRange(1, 1, 1, 11)
        .setFontWeight("bold")
        .setBackground("#FF6D00")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    // 4. Catat Baris Transaksi Baru
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
      data.signedAmount,
    ]);

    // 5. Format kolom nominal (kolom 10 & 11) ke format Rupiah
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 10, 1, 2).setNumberFormat('"Rp"#,##0');

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Transaksi berhasil dicatat ke tab " + sheetName,
        sheet: sheetName,
        row: lastRow,
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 7. WhatsApp Bot Engine: Panduan Perintah Lengkap

### A. Format Pencatatan Transaksi Cepat
- `Parkir 2000` *(Otomatis: Tunai)*
- `Beli baju 150rb tf` atau `150k bca` *(Otomatis: Bank)*
- `Kopi susu 25k qris` atau `25rb gopay` *(Otomatis: E-Wallet)*
- `+5000000 Gaji bulanan` *(Otomatis: Bank)*
- `+50k Cash bonus` *(Otomatis: Tunai)*

### B. Perintah Saldo Awal via WhatsApp
| Perintah WhatsApp | Fungsi | Contoh |
|---|---|---|
| `!setsaldo` atau `saldo awal` | Cek status rincian saldo awal saat ini | `!setsaldo` |
| `!setsaldo <nominal>` | Atur total saldo awal | `!setsaldo 1000000` atau `!setsaldo 1jt` |
| `!setsaldo bank <nominal>` | Atur saldo awal rekening bank | `!setsaldo bank 750k` |
| `!setsaldo cash <nominal>` | Atur saldo awal kas tunai | `!setsaldo cash 250k` |

### C. Perintah Fitur & Spreadsheet
| Perintah WhatsApp | Fungsi | Contoh |
|---|---|---|
| `rekap` / `laporan` | Ringkasan saldo awal, mutasi, saldo akhir, rincian bank/cash & kategori | `rekap` |
| `!setsheet` | Cek status integrasi Google Sheets aktif/nonaktif & panduan | `!setsheet` |
| `!setsheet <URL>` | Pasang Webhook URL Apps Script dan aktifkan auto-sync | `!setsheet https://script.google.com/.../exec` |
| `!setsheet test` | Kirim baris data pengujian ke spreadsheet | `!setsheet test` |
| `!setsheet code` | Minta kode Apps Script | `!setsheet code` |
| `!setsheet off` | Nonaktifkan auto-sync spreadsheet | `!setsheet off` |
| `rekap excel` / `export` | Tautan unduh instan CSV / Excel | `rekap excel` |
| `status` / `kuota` | Cek pemakaian kuota dan masa aktif membership | `status` |
| `paket` | Lihat daftar harga paket PRO & UNLIMITED | `paket` |
| `bantuan` | Panduan lengkap bot | `bantuan` |

---

## 8. Integrasi Mobile Android / Flutter (Dart)

### A. Model User & Saldo Awal (`UserModel.dart`):

```dart
class UserModel {
  final String id;
  final String phoneNumber;
  final String name;
  final bool isAdmin;
  final String plan;
  final int monthlyQuota;
  final int usedQuota;
  final int remainingQuota;
  final double initialBalance;
  final double initialBankBalance;
  final double initialCashBalance;
  final String? sheetWebhookUrl;
  final bool autoSyncSheet;

  UserModel({
    required this.id,
    required this.phoneNumber,
    required this.name,
    required this.isAdmin,
    required this.plan,
    required this.monthlyQuota,
    required this.usedQuota,
    required this.remainingQuota,
    this.initialBalance = 0.0,
    this.initialBankBalance = 0.0,
    this.initialCashBalance = 0.0,
    this.sheetWebhookUrl,
    this.autoSyncSheet = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    final quota = json['quota'];
    return UserModel(
      id: user['id'],
      phoneNumber: user['phoneNumber'],
      name: user['name'] ?? '',
      isAdmin: user['isAdmin'] ?? false,
      plan: user['plan'],
      monthlyQuota: user['monthlyQuota'],
      usedQuota: quota['used'],
      remainingQuota: quota['remaining'],
      initialBalance: (user['initialBalance'] ?? 0).toDouble(),
      initialBankBalance: (user['initialBankBalance'] ?? 0).toDouble(),
      initialCashBalance: (user['initialCashBalance'] ?? 0).toDouble(),
      sheetWebhookUrl: user['sheetWebhookUrl'],
      autoSyncSheet: user['autoSyncSheet'] ?? false,
    );
  }
}
```

### B. Model Transaksi & Payment Method (`TransactionModel.dart`):

```dart
enum PaymentMethod { CASH, BANK, E_WALLET }

class TransactionModel {
  final String id;
  final double amount;
  final String description;
  final String type; // 'EXPENSE' | 'INCOME'
  final PaymentMethod paymentMethod;
  final DateTime date;
  final String? categoryName;

  TransactionModel({
    required this.id,
    required this.amount,
    required this.description,
    required this.type,
    required this.paymentMethod,
    required this.date,
    this.categoryName,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    PaymentMethod method = PaymentMethod.CASH;
    if (json['paymentMethod'] == 'BANK') method = PaymentMethod.BANK;
    if (json['paymentMethod'] == 'E_WALLET') method = PaymentMethod.E_WALLET;

    return TransactionModel(
      id: json['id'],
      amount: (json['amount'] as num).toDouble(),
      description: json['description'],
      type: json['type'],
      paymentMethod: method,
      date: DateTime.parse(json['date']),
      categoryName: json['category']?['name'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'amount': amount,
    'description': description,
    'type': type,
    'paymentMethod': paymentMethod.name,
  };
}
```

### C. Service Saldo Awal di Flutter (`initial_balance_service.dart`):

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class InitialBalanceService {
  static const String baseUrl = 'https://bot-finance-pi.vercel.app';

  /// Simpan saldo awal Bank dan Tunai dari Flutter
  static Future<bool> saveInitialBalance({
    required String phoneNumber,
    required double bankBalance,
    required double cashBalance,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/user/initial-balance'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phoneNumber': phoneNumber,
        'initialBankBalance': bankBalance,
        'initialCashBalance': cashBalance,
      }),
    );
    return response.statusCode == 200;
  }
}
```

---

## 9. Ringkasan Endpoint Lengkap

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login Flutter & Web (mengembalikan user, saldo awal, `isAdmin`, dan kuota) |
| `GET` | `/api/auth/me` | Refresh profile user & kuota real-time |
| `GET` | `/api/user/initial-balance` | Ambil data saldo awal user (Total, Bank, Cash) |
| `POST` | `/api/user/initial-balance` | Simpan / update saldo awal user (Total, Bank, Cash) |
| `POST` | `/api/transactions` | Catat transaksi baru dengan `paymentMethod` (`CASH`, `BANK`, `E_WALLET`) |
| `GET` | `/api/transactions` | Ambil riwayat transaksi user (`?phoneNumber=...`) |
| `GET` | `/api/transactions/summary` | Rekapitulasi keuangan, saldo awal, saldo akhir & per kategori |
| `GET` | `/api/transactions/export` | Unduh file `.csv` / Excel berformat UTF-8 BOM lengkap dengan kolom Pembayaran |
| `GET` | `/api/user/sheet-settings` | Ambil Webhook URL & status auto-sync Google Sheets user |
| `POST` | `/api/user/sheet-settings` | Simpan / update Webhook URL & toggle auto-sync Google Sheets |
| `POST` | `/api/user/sheet-settings/test` | Kirim baris sampel untuk menguji koneksi Webhook Google Sheets |
| `GET` | `/api/categories` | Ambil daftar kategori |
| `POST` | `/api/admin/subscription` | **Admin:** Edit kuota maks transaksi, paket, masa aktif, dan status admin user |
| `GET` | `/api/admin/subscription` | **Admin:** Lihat daftar seluruh user dan penggunaan kuotanya |
| `GET` | `/api/admin/dashboard` | **Admin:** Metrik analitik & statistik Dashboard Direktur |
| `GET` | `/api/admin/health` | **Admin:** Monitoring status kesehatan 3 engine (API, Database Supabase, dan Bot WA) |
