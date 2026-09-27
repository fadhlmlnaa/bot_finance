# PingKas - Personal Finance Tracker & WhatsApp Bot Engine Documentation

Dokumentasi komprehensif arsitektur sistem, skema database (Prisma & Supabase), API Autentikasi Flutter, API Manajemen Kuota & Subscription Admin, Dashboard Analitik Direktur, Monitoring Kesehatan 3 Engine, Auto-Sync Multi-Tab Google Spreadsheet, Pencatatan Keuangan di WhatsApp Group, Pembatasan Akses Pengguna Terdaftar, serta Contoh Integrasi Lengkap Mobile Flutter (Dart).

---

## 1. Arsitektur & Tech Stack

- **Web & API Framework**: Next.js 16 (App Router, Turbopack, Tailwind CSS)
- **Language**: TypeScript & Dart (Flutter)
- **Database ORM**: Prisma ORM (v6)
- **Database Engine**: PostgreSQL (Supabase Connection Pooler)
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-device QR Authentication Worker)
- **Spreadsheet Sync Engine**: Asynchronous Webhook ke Google Apps Script (Multi-Tab Bulanan)
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

enum SubscriptionPlan {
  FREE
  PRO
  UNLIMITED
}

model User {
  id              String           @id @default(uuid())
  phoneNumber     String           @unique
  name            String?
  createdAt       DateTime         @default(now())

  // Membership & Admin Role
  plan            SubscriptionPlan @default(FREE)
  subscriptionEnd DateTime?
  monthlyQuota    Int              @default(20) // Maksimal transaksi per bulan
  isAdmin         Boolean          @default(false) // Penentu akses menu Admin di Flutter/Web

  // Google Sheets Auto-Sync
  sheetWebhookUrl String?          // Webhook Apps Script milik pengguna
  autoSyncSheet   Boolean          @default(false)

  categories      Category[]
  transactions    Transaction[]
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

## 3. API Autentikasi Login Flutter & Web (`POST /api/auth/login`)

Digunakan oleh aplikasi Flutter dan Web Portal untuk login/register menggunakan nomor telepon. Mengembalikan profil lengkap, status `isAdmin`, URL Webhook Spreadsheet, serta sisa kuota transaksi bulan berjalan.

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

## 4. API Khusus Admin (Kelola Membership & Dashboard Direktur)

### A. Edit Kuota, Paket & Role Admin (`POST /api/admin/subscription`)

Admin dapat menyesuaikan kuota, upgrade paket, masa aktif, maupun status Admin pengguna.

- **URL**: `POST /api/admin/subscription` (atau `PUT /api/admin/subscription`)
- **Headers**: `Content-Type: application/json`

#### Request Body Contoh:
```json
{
  "phoneNumber": "085280357817",
  "plan": "PRO",
  "durationDays": 30,
  "monthlyQuota": 500,
  "isAdmin": true
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "message": "User 6285280357817 successfully updated.",
  "data": {
    "user": {
      "id": "4375a054-7a81-4b55-96f0-2ccebeb500c9",
      "phoneNumber": "6285280357817",
      "name": "Fadhil Maulana",
      "isAdmin": true,
      "plan": "PRO",
      "monthlyQuota": 500,
      "subscriptionEnd": "2026-10-28T00:46:00.000Z"
    },
    "quota": {
      "used": 4,
      "maxQuota": 500,
      "remaining": 496,
      "isAllowed": true,
      "isUnlimited": false
    }
  }
}
```

---

### B. List Seluruh Pengguna & Kuota Realtime (`GET /api/admin/subscription`)

- **URL**: `GET /api/admin/subscription`
- **Query Params**:
  - `?search=0852` (Cari nomor HP atau nama)
  - `?plan=PRO` (Filter paket `FREE`, `PRO`, atau `UNLIMITED`)

---

### C. Dashboard Analitik Direktur (`GET /api/admin/dashboard`)

- **URL**: `GET /api/admin/dashboard`
- **Response**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalUsers": 25,
      "freeUsers": 18,
      "proUsers": 5,
      "unlimitedUsers": 2,
      "adminUsers": 2,
      "activePaidSubscriptions": 7,
      "totalTransactions": 348,
      "totalIncomeVolume": 85000000,
      "totalExpenseVolume": 14250000
    },
    "recentUsers": [ ... ]
  }
}
```

---

### D. Monitoring Kondisi Kesehatan 3 Engine (`GET /api/admin/health`)

Memantau status kesehatan & latensi 3 engine utama (**Next.js API**, **PostgreSQL Supabase**, dan **WhatsApp Baileys Worker**):

- **URL**: `GET /api/admin/health` (atau `GET /api/admin/engine-status`)
- **Response**:
```json
{
  "success": true,
  "overallStatus": "HEALTHY",
  "totalResponseTimeMs": 42,
  "timestamp": "2026-09-28T00:50:00.000Z",
  "engines": {
    "api": {
      "name": "Next.js API Engine",
      "status": "healthy",
      "environment": "production",
      "platform": "Vercel Serverless"
    },
    "database": {
      "name": "PostgreSQL Database Engine (Supabase)",
      "status": "healthy",
      "latencyMs": 14,
      "provider": "PostgreSQL Pooler",
      "metrics": { "usersCount": 25, "transactionsCount": 348, "categoriesCount": 8 }
    },
    "whatsapp": {
      "name": "WhatsApp Bot Engine (Baileys Worker)",
      "status": "healthy",
      "latencyMs": 28,
      "connected": true,
      "botNumber": "6283878198815",
      "workerUrl": "https://finance-wa-bot-xxx.onrender.com"
    }
  }
}
```

---

## 5. Fitur Auto-Sync Multi-Tab Google Spreadsheet & Ekspor CSV

Fitur ini memungkinkan setiap transaksi yang dicatat via **WhatsApp Bot**, **Website User Portal**, maupun **Aplikasi Android/iOS Flutter** otomatis tersimpan ke **Google Spreadsheet pribadi milik user** dengan pemisahan tab bulanan otomatis (*contoh tab: `September 2026`, `Oktober 2026`*).

### A. Alur Kerja Auto-Sync (Real-time & Non-blocking)
1. User membuat Google Spreadsheet di Google Drive & memasang script Apps Script di bawah.
2. User mengaktifkan Auto-Sync dan memasukkan Webhook URL Google Apps Script (`/exec`).
3. Setiap ada transaksi baru masuk, server Next.js memicu `syncTransactionToGoogleSheet()` secara asynchronous di background dengan timeout 6 detik sehingga bot WhatsApp & respons API tetap instan (< 500ms).
4. Google Apps Script memeriksa tab bulan transaksi (`sheetName`). Jika tab belum ada, script **otomatis membuat tab baru** (`insertSheet(sheetName)`) dan memasang header oranye PingKas.

---

### B. Template Google Apps Script (`Code.gs`)
Salin kode berikut ke Google Spreadsheet di menu **Ekstensi (Extensions)** > **Apps Script**, lalu klik **Deploy** > **New deployment** > **Web app** (*Who has access: Anyone*):

```javascript
/**
 * PINGKAS - Google Apps Script Webhook Listener (Multi-Tab Bulanan Otomatis)
 * Script ini menerima payload JSON dari PingKas dan otomatis mencatat ke Tab Sheet berdasarkan bulan (contoh: "September 2026").
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

    // 2. Cari tab sheet bulan terkait, jika belum ada, buat tab baru secara otomatis!
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
        "Kategori",
        "Deskripsi",
        "Nominal (Rp)",
        "Nominal (+/-)",
      ]);
      sheet
        .getRange(1, 1, 1, 10)
        .setFontWeight("bold")
        .setBackground("#FF6D00")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    // 4. Catat Baris Transaksi Baru ke tab bulan terkait
    sheet.appendRow([
      data.id || "TRX-" + new Date().getTime(),
      data.date,
      data.time,
      "'" + data.phoneNumber,
      data.userName || "-",
      data.type,
      data.category || "Umum",
      data.description,
      data.amount,
      data.signedAmount,
    ]);

    // 5. Format kolom nominal (kolom 9 & 10) ke format Rupiah
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 9, 1, 2).setNumberFormat('"Rp"#,##0');

    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Transaksi berhasil dicatat ke tab sheet " + sheetName,
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

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "active",
      message: "PingKas Google Sheets Webhook is ready!",
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```

---

### C. Endpoint Pengaturan Webhook & Ekspor CSV

#### 1. Ambil Pengaturan Google Sheets (`GET /api/user/sheet-settings`)
- **URL**: `GET /api/user/sheet-settings?phoneNumber=085280357817`

#### 2. Simpan Pengaturan Google Sheets (`POST /api/user/sheet-settings`)
- **URL**: `POST /api/user/sheet-settings`
- **Body**:
```json
{
  "phoneNumber": "085280357817",
  "sheetWebhookUrl": "https://script.google.com/macros/s/AKfycb.../exec",
  "autoSyncSheet": true
}
```

#### 3. Tes Koneksi Webhook (`POST /api/user/sheet-settings/test`)
- **URL**: `POST /api/user/sheet-settings/test`
- **Body**:
```json
{
  "phoneNumber": "085280357817",
  "sheetWebhookUrl": "https://script.google.com/macros/s/.../exec"
}
```

#### 4. Unduh Rekap Transaksi (.CSV / Excel UTF-8 BOM) (`GET /api/transactions/export`)
- **URL**: `GET /api/transactions/export?phoneNumber=085280357817&month=9&year=2026&type=ALL`
- **Header Response**: `Content-Disposition: attachment; filename="PingKas_Rekap_6285280357817_2026-09.csv"`

---

### D. Pengaturan Auto-Sync Spreadsheet Langsung via Chat WhatsApp

Pengguna dapat mengonfigurasi, menguji, dan mengaktifkan integrasi Google Sheets langsung dari aplikasi WhatsApp tanpa perlu membuka Web Portal:

| Perintah WhatsApp | Fungsi | Contoh Penggunaan |
|---|---|---|
| `!setsheet` | Cek status integrasi Google Sheets aktif/nonaktif & panduan | `!setsheet` |
| `!setsheet <URL>` | Pasang / Update Webhook URL Google Apps Script dan otomatis aktifkan sync | `!setsheet https://script.google.com/macros/s/.../exec` |
| `!setsheet test` | Kirim 1 baris transaksi uji coba ke spreadsheet untuk verifikasi | `!setsheet test` |
| `!setsheet code` | Minta bot mengirimkan template kode Google Apps Script siap copy-paste | `!setsheet code` |
| `!setsheet off` | Menonaktifkan auto-sync Google Sheets | `!setsheet off` |
| `rekap excel` / `export` | Minta tautan unduh instan file `.csv` rekapitulasi keuangan | `rekap excel` |

---

## 6. WhatsApp Bot Engine: Fitur Group & Keamanan Akses

### A. Fitur Pencatatan di WhatsApp Group via Tag / Mention (`@bot`)
- **Filter Tag/Mention**: Bot mengabaikan obrolan umum grup. Bot hanya merespons saat di-tag (`@PingKas Beli bensin 25rb`) atau saat pesan bot direply.
- **Deteksi Pengirim Mandiri (`participant`)**: Setiap anggota grup yang men-tag bot akan mencatat ke **akun & kuota masing-masing**, tidak tercampur dengan anggota grup lain.
- **Struk Transaksi**: Bot membalas di grup dengan me-mention tag `@nomor` pengirim dan sisa kuotanya.

### B. Pembatasan Akses: Hanya Merespons Pengguna Terdaftar
- **Validasi Database**: Setiap pesan masuk akan diverifikasi terlebih dahulu apakah nomor WhatsApp telah terdaftar di database Supabase.
- **Auto-Reply Onboarding**: Jika pengguna belum terdaftar, bot akan membalas dengan tautan pendaftaran ke Web Portal (`/portal`) dan Aplikasi Mobile.
- **Admin Privilege**: Nomor Owner/Admin tetap dapat menjalankan perintah administratif (`!upgrade`, `!setkuota`).

---

## 7. Integrasi Mobile Android / Flutter (Lengkap)

### A. Model User & Auth (`UserModel.dart`):

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
      sheetWebhookUrl: user['sheetWebhookUrl'],
      autoSyncSheet: user['autoSyncSheet'] ?? false,
    );
  }
}
```

---

### B. Service Google Sheets & Ekspor di Flutter (`spreadsheet_service.dart`):

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class SpreadsheetService {
  static const String baseUrl = 'https://bot-finance-pi.vercel.app';

  /// 1. Ambil pengaturan Webhook Sheets user
  static Future<Map<String, dynamic>?> getSheetSettings(String phoneNumber) async {
    final uri = Uri.parse('$baseUrl/api/user/sheet-settings').replace(
      queryParameters: {'phoneNumber': phoneNumber},
    );
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json['data'];
    }
    return null;
  }

  /// 2. Simpan pengaturan Webhook & Toggle Auto-Sync
  static Future<bool> saveSheetSettings({
    required String phoneNumber,
    String? sheetWebhookUrl,
    required bool autoSyncSheet,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/user/sheet-settings'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phoneNumber': phoneNumber,
        'sheetWebhookUrl': sheetWebhookUrl,
        'autoSyncSheet': autoSyncSheet,
      }),
    );
    return response.statusCode == 200;
  }

  /// 3. Uji coba kirim 1 baris sampel ke Google Spreadsheet
  static Future<Map<String, dynamic>> testSheetWebhook({
    required String phoneNumber,
    required String sheetWebhookUrl,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/user/sheet-settings/test'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phoneNumber': phoneNumber,
        'sheetWebhookUrl': sheetWebhookUrl,
      }),
    );
    return jsonDecode(response.body);
  }

  /// 4. Unduh Rekap CSV / Excel ke Penyimpanan Lokal Android / iOS
  static Future<File?> downloadCsvReport({
    required String phoneNumber,
    int? month,
    int? year,
    String? type,
  }) async {
    final queryParams = <String, String>{'phoneNumber': phoneNumber};
    if (month != null) queryParams['month'] = month.toString();
    if (year != null) queryParams['year'] = year.toString();
    if (type != null) queryParams['type'] = type;

    final uri = Uri.parse('$baseUrl/api/transactions/export').replace(
      queryParameters: queryParams,
    );

    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final dir = await getApplicationDocumentsDirectory();
      final filename = 'PingKas_Rekap_${phoneNumber}_${DateTime.now().millisecondsSinceEpoch}.csv';
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(response.bodyBytes);
      return file;
    }
    return null;
  }
}
```

---

### C. Widget Pengaturan Google Sheets di Android (`spreadsheet_settings_page.dart`):

```dart
import 'package:flutter/material.dart';
import 'spreadsheet_service.dart';

class SpreadsheetSettingsPage extends StatefulWidget {
  final String phoneNumber;

  const SpreadsheetSettingsPage({super.key, required this.phoneNumber});

  @override
  State<SpreadsheetSettingsPage> createState() => _SpreadsheetSettingsPageState();
}

class _SpreadsheetSettingsPageState extends State<SpreadsheetSettingsPage> {
  final _urlController = TextEditingController();
  bool _autoSync = false;
  bool _isLoading = true;
  bool _isTesting = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    final data = await SpreadsheetService.getSheetSettings(widget.phoneNumber);
    if (data != null) {
      _urlController.text = data['sheetWebhookUrl'] ?? '';
      _autoSync = data['autoSyncSheet'] ?? false;
    }
    setState(() => _isLoading = false);
  }

  Future<void> _testConnection() async {
    if (_urlController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan Webhook URL terlebih dahulu!')),
      );
      return;
    }
    setState(() => _isTesting = true);
    final res = await SpreadsheetService.testSheetWebhook(
      phoneNumber: widget.phoneNumber,
      sheetWebhookUrl: _urlController.text.trim(),
    );
    setState(() => _isTesting = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message'] ?? 'Uji coba selesai'),
          backgroundColor: res['success'] == true ? Colors.green : Colors.red,
        ),
      );
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    final success = await SpreadsheetService.saveSheetSettings(
      phoneNumber: widget.phoneNumber,
      sheetWebhookUrl: _urlController.text.trim().isEmpty ? null : _urlController.text.trim(),
      autoSyncSheet: _autoSync,
    );
    setState(() => _isSaving = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Pengaturan berhasil disimpan!' : 'Gagal menyimpan'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFFFF6D00);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Auto-Sync Spreadsheet', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Info Box
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFFE0B2)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('📊 Sinkronisasi Google Sheets Otomatis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor)),
                      SizedBox(height: 6),
                      Text(
                        '1. Buka Google Sheet > Ekstensi > Apps Script\n'
                        '2. Tempelkan script listener PingKas\n'
                        '3. Deploy as Web App (Akses: Anyone)\n'
                        '4. Tempelkan URL Web App (/exec) di bawah',
                        style: TextStyle(fontSize: 12, color: Colors.black87, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Webhook URL Input
                TextField(
                  controller: _urlController,
                  decoration: InputDecoration(
                    labelText: 'Google Apps Script Webhook URL',
                    hintText: 'https://script.google.com/macros/s/.../exec',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: primaryColor, width: 2),
                    ),
                  ),
                  style: const TextStyle(fontSize: 13),
                ),
                const SizedBox(height: 16),

                // Auto-Sync Switch
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: primaryColor,
                  title: const Text('Aktifkan Auto-Sync Real-time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: const Text('Setiap transaksi via Bot/Web/App langsung masuk spreadsheet', style: TextStyle(fontSize: 12)),
                  value: _autoSync,
                  onChanged: (val) => setState(() => _autoSync = val),
                ),
                const SizedBox(height: 24),

                // Test Button
                OutlinedButton.icon(
                  onPressed: _isTesting ? null : _testConnection,
                  icon: _isTesting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send_rounded, size: 18),
                  label: const Text('Uji Coba Kirim 1 Baris Data'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),

                // Save Button
                ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Simpan Pengaturan', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ],
            ),
    );
  }
}
```

---

### D. Service Admin di Flutter (`admin_service.dart`):

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AdminService {
  static const String baseUrl = 'https://bot-finance-pi.vercel.app';

  // 1. Edit Kuota Transaksi & Subscription User dari Mobile
  static Future<bool> updateUserQuota({
    required String phoneNumber,
    int? monthlyQuota,
    String? plan, // 'FREE' | 'PRO' | 'UNLIMITED'
    int? durationDays,
    bool? isAdmin,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/admin/subscription'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phoneNumber': phoneNumber,
        if (monthlyQuota != null) 'monthlyQuota': monthlyQuota,
        if (plan != null) 'plan': plan,
        if (durationDays != null) 'durationDays': durationDays,
        if (isAdmin != null) 'isAdmin': isAdmin,
      }),
    );

    return response.statusCode == 200;
  }

  // 2. Mengambil Semua User & Sisa Kuotanya
  static Future<List<dynamic>> getAllUsers({String? search, String? plan}) async {
    final queryParams = <String, String>{};
    if (search != null && search.isNotEmpty) queryParams['search'] = search;
    if (plan != null && plan.isNotEmpty) queryParams['plan'] = plan;

    final uri = Uri.parse('$baseUrl/api/admin/subscription').replace(queryParameters: queryParams);
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json['users'];
    }
    return [];
  }

  // 3. Mengambil Metrik Dashboard Direktur
  static Future<Map<String, dynamic>> getDirectorDashboardStats() async {
    final response = await http.get(Uri.parse('$baseUrl/api/admin/dashboard'));
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return json['data']['metrics'];
    }
    throw Exception('Gagal memuat analitik dashboard');
  }
}
```

---

## 8. Ringkasan Endpoint Lengkap

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login Flutter (mengembalikan user, `isAdmin`, `sheetWebhookUrl`, dan sisa kuota) |
| `GET` | `/api/auth/me` | Refresh profile user & kuota real-time |
| `POST` | `/api/transactions` | Catat transaksi baru dari Flutter / WA (auto-sync ke Google Sheets jika aktif) |
| `GET` | `/api/transactions` | Ambil riwayat transaksi user (`?phoneNumber=...`) |
| `GET` | `/api/transactions/summary` | Rekapitulasi keuangan & per kategori (`?phoneNumber=...`) |
| `GET` | `/api/transactions/export` | Unduh file `.csv` / Excel rekapitulasi transaksi berformat UTF-8 BOM |
| `GET` | `/api/user/sheet-settings` | Ambil Webhook URL & status auto-sync Google Sheets user |
| `POST` | `/api/user/sheet-settings` | Simpan / update Webhook URL & toggle auto-sync Google Sheets |
| `POST` | `/api/user/sheet-settings/test` | Kirim baris sampel untuk menguji koneksi Webhook Google Sheets |
| `GET` | `/api/categories` | Ambil daftar kategori |
| `POST` | `/api/admin/subscription` | **Admin:** Edit kuota maks transaksi, paket, masa aktif, dan status admin user |
| `GET` | `/api/admin/subscription` | **Admin:** Lihat daftar seluruh user dan penggunaan kuotanya |
| `GET` | `/api/admin/dashboard` | **Admin:** Metrik analitik & statistik Dashboard Direktur |
| `GET` | `/api/admin/health` | **Admin:** Monitoring status kesehatan 3 engine (API, Database Supabase, dan Bot WA) |
