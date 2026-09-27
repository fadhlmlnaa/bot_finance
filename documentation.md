# Personal Finance Tracker Backend Documentation

Dokumentasi arsitektur, skema database, API Auth Login (Flutter), Menu Admin (`is_admin`), API Transaksi Mobile & Bot WA, sistem Membership/Kuota Bulanan, serta integrasi Flutter & WhatsApp Bot.

---

## 1. Arsitektur & Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma ORM
- **Database Engine**: PostgreSQL (Supabase Connection Pooler)
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-device QR authentication)
- **Mobile Integration**: REST API for Flutter Mobile Apps

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

## 4. API Create Transaksi Mobile Apps (`POST /api/transactions`)

Digunakan untuk mencatat pengeluaran/pemasukan dari aplikasi Flutter.

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
*(Catatan: Bisa menggunakan `phoneNumber` atau `userId`. Field `date` dan `category` bersifat opsional).*

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

## 5. Contoh Integrasi di Flutter (Dart)

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

### B. Service Login & Create Transaction (`api_service.dart`):

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'https://bot-finance-xxx.vercel.app';

  // 1. Auth Login
  static Future<UserModel> login(String phoneNumber, {String? name}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phoneNumber': phoneNumber, 'name': name}),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return UserModel.fromJson(json['data']);
    } else {
      throw Exception('Gagal login: ${response.body}');
    }
  }

  // 2. Create Transaksi
  static Future<bool> createTransaction({
    required String phoneNumber,
    required String description,
    required double amount,
    required String type, // 'INCOME' | 'EXPENSE'
    String? category,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/transactions'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phoneNumber': phoneNumber,
        'description': description,
        'amount': amount,
        'type': type,
        'category': category,
      }),
    );

    return response.statusCode == 200;
  }
}
```

### C. Menampilkan Menu Khusus Admin di UI Flutter:

```dart
Widget buildDashboard(UserModel user) {
  return Column(
    children: [
      // Info Kuota User
      Text('Paket: ${user.plan} (${user.usedQuota}/${user.monthlyQuota} Transaksi)'),

      // Menu Utama User Biasa
      ElevatedButton(onPressed: () => addTransaction(), child: Text('Tambah Transaksi')),
      ElevatedButton(onPressed: () => viewHistory(), child: Text('Riwayat Transaksi')),

      // KHUSUS ADMIN (Hanya muncul jika isAdmin == true)
      if (user.isAdmin) ...[
        Divider(),
        Text('👑 Panel Khusus Admin', style: TextStyle(fontWeight: FontWeight.bold)),
        ListTile(
          leading: Icon(Icons.people, color: Colors.amber),
          title: Text('Kelola Membership & Kuota User'),
          onTap: () => Navigator.pushNamed(context, '/admin/subscriptions'),
        ),
        ListTile(
          leading: Icon(Icons.admin_panel_settings, color: Colors.blue),
          title: Text('Dashboard Direktur / Rekap Global'),
          onTap: () => Navigator.pushNamed(context, '/admin/director-dashboard'),
        ),
      ],
    ],
  );
}
```

---

## 6. Ringkasan Endpoint Lengkap

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login Flutter (mengembalikan data user, `isAdmin`, dan sisa kuota) |
| `GET` | `/api/auth/me` | Refresh profile user & kuota real-time |
| `POST` | `/api/transactions` | Catat transaksi baru dari Flutter / WA (dengan validasi kuota) |
| `GET` | `/api/transactions` | Ambil riwayat transaksi user (`?phoneNumber=...`) |
| `GET` | `/api/transactions/summary` | Rekapitulasi keuangan & per kategori (`?phoneNumber=...`) |
| `GET` | `/api/categories` | Ambil daftar kategori |
| `POST` | `/api/admin/subscription` | Aktivasi / Ubah paket & kuota user oleh Admin |
| `GET` | `/api/admin/subscription` | Lihat daftar seluruh user dan penggunaan kuotanya |
