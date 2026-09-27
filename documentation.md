# Personal Finance Tracker Backend Documentation

Dokumentasi arsitektur, skema database, API Auth Login (Flutter), API Admin (Edit Maksimal Kuota & Subscription), Dashboard Direktur, API Transaksi Mobile & Bot WA, serta integrasi lengkap Flutter & WhatsApp Bot.

---

## 1. Arsitektur & Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL (Supabase Connection Pooler)
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-device QR authentication)
- **Deployment**: Next.js API (Vercel) + WA Bot Worker (Render / Docker)

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
  isAdmin         Boolean          @default(false) // Penentu akses menu Admin di Flutter

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

## 3. API Autentikasi Login Flutter (`POST /api/auth/login`)

Digunakan oleh aplikasi Flutter untuk login/register menggunakan nomor telepon. Sistem secara otomatis mengembalikan flag **`isAdmin`** agar aplikasi Flutter bisa menampilkan menu khusus Admin.

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

## 4. API Khusus Admin (Edit Kuota, Subscription & Dashboard)

### A. Edit Maksimal Kuota & Subscription User (`POST /api/admin/subscription`)

Admin di aplikasi mobile dapat mengedit kuota maksimal transaksi per bulan, paket (`FREE`/`PRO`/`UNLIMITED`), masa aktif, dan status admin.

- **URL**: `POST /api/admin/subscription` (atau `PUT /api/admin/subscription`)
- **Headers**: `Content-Type: application/json`

#### Contoh 1: Edit Kuota Maksimal Transaksi Saja
```json
{
  "phoneNumber": "085280357817",
  "monthlyQuota": 500
}
```

#### Contoh 2: Upgrade Paket Langganan + Durasi Hari + Custom Kuota
```json
{
  "phoneNumber": "085280357817",
  "plan": "PRO",
  "durationDays": 30,
  "monthlyQuota": 300
}
```

#### Contoh 3: Jadikan User sebagai Admin
```json
{
  "phoneNumber": "085280357817",
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

Digunakan untuk list user di menu Kelola Membership Admin pada aplikasi mobile:

- **URL**: `GET /api/admin/subscription`
- **Query Params**:
  - `?search=0852` (Cari nomor HP atau nama)
  - `?plan=PRO` (Filter paket FREE, PRO, atau UNLIMITED)

#### Response:
```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "id": "4375a054-...",
      "phoneNumber": "6285280357817",
      "name": "Fadhil Maulana",
      "isAdmin": true,
      "plan": "PRO",
      "monthlyQuota": 500,
      "subscriptionEnd": "2026-10-28T00:46:00.000Z",
      "totalTransactionsCount": 12,
      "usage": {
        "used": 4,
        "maxQuota": 500,
        "remaining": 496,
        "isAllowed": true,
        "isUnlimited": false,
        "expiresAt": "2026-10-28T00:46:00.000Z"
      }
    }
  ]
}
```

---

### C. Dashboard Analitik Direktur (`GET /api/admin/dashboard`)

Digunakan untuk menampilkan performa bisnis, total user aktif, dan volume transaksi:

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

### D. Monitoring Kondisi Server & Engine (`GET /api/admin/health` & `GET /api/admin/engine-status`)

Digunakan oleh aplikasi Flutter Admin untuk memantau status kesehatan & latensi 3 engine utama (**API Engine**, **PostgreSQL Database**, dan **WhatsApp Bot Worker**):

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
      "platform": "Vercel Serverless",
      "nodeVersion": "v20.x",
      "timestamp": "2026-09-28T00:50:00.000Z"
    },
    "database": {
      "name": "PostgreSQL Database Engine (Supabase)",
      "status": "healthy",
      "latencyMs": 14,
      "provider": "PostgreSQL Pooler",
      "metrics": {
        "usersCount": 25,
        "transactionsCount": 348,
        "categoriesCount": 8
      }
    },
    "whatsapp": {
      "name": "WhatsApp Bot Engine (Baileys Worker)",
      "status": "healthy",
      "latencyMs": 28,
      "connected": true,
      "botNumber": "6283878198815",
      "workerUrl": "https://finance-wa-bot-xxx.onrender.com",
      "uptime": 14205
    }
  }
}
```

---

## 5. API Create Transaksi Mobile Apps (`POST /api/transactions`)

Digunakan untuk mencatat pengeluaran/pemasukan dari aplikasi Flutter atau Bot WhatsApp.

### Request:
- **URL**: `POST /api/transactions`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "phoneNumber": "6285280357817",
  "description": "Beli Kopi Starbucks",
  "amount": 55000,
  "type": "EXPENSE",
  "category": "Makanan & Minuman",
  "date": "2026-09-27T23:40:00.000Z"
}
```

### Response Success (`200 OK`):
```json
{
  "success": true,
  "message": "Transaction recorded",
  "data": {
    "id": "da2347ba-b171-4cb3-bb9d-2cac28a969a9",
    "amount": 55000,
    "description": "Beli Kopi Starbucks",
    "type": "EXPENSE",
    "date": "2026-09-27T23:40:00.000Z",
    "userId": "4375a054-7a81-4b55-96f0-2ccebeb500c9",
    "categoryId": "8a20e39c-1532-47d8-898d-af1c435f4646",
    "category": {
      "id": "8a20e39c-1532-47d8-898d-af1c435f4646",
      "name": "Makanan & Minuman",
      "type": "EXPENSE"
    }
  },
  "quota": {
    "used": 5,
    "maxQuota": 200,
    "remaining": 195,
    "plan": "PRO"
  }
}
```

---

## 6. Contoh Integrasi di Flutter (Dart)

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

  UserModel({
    required this.id,
    required this.phoneNumber,
    required this.name,
    required this.isAdmin,
    required this.plan,
    required this.monthlyQuota,
    required this.usedQuota,
    required this.remainingQuota,
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
    );
  }
}
```

### B. Service Admin di Flutter (`admin_service.dart`):

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

## 7. Ringkasan Endpoint Lengkap

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login Flutter (mengembalikan user, `isAdmin`, dan sisa kuota) |
| `GET` | `/api/auth/me` | Refresh profile user & kuota real-time |
| `POST` | `/api/transactions` | Catat transaksi baru dari Flutter / WA (dengan validasi kuota) |
| `GET` | `/api/transactions` | Ambil riwayat transaksi user (`?phoneNumber=...`) |
| `GET` | `/api/transactions/summary` | Rekapitulasi keuangan & per kategori (`?phoneNumber=...`) |
| `GET` | `/api/categories` | Ambil daftar kategori |
| `POST` | `/api/admin/subscription` | **Admin:** Edit kuota maks transaksi, paket, masa aktif, dan status admin user |
| `GET` | `/api/admin/subscription` | **Admin:** Lihat daftar seluruh user dan penggunaan kuotanya |
| `GET` | `/api/admin/dashboard` | **Admin:** Metrik analitik & statistik Dashboard Direktur |
| `GET` | `/api/admin/health` | **Admin:** Monitoring status kesehatan 3 engine (API, Database Supabase, dan Bot WA) |
