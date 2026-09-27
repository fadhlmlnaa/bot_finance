# Personal Finance Tracker Backend Documentation

Dokumentasi arsitektur, skema database, API endpoints, sistem Membership/Kuota Bulanan, kategorisasi otomatis, rekapitulasi, serta panduan WhatsApp Bot (Baileys) dan Flutter Mobile App.

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

  // Membership & Quota
  plan            SubscriptionPlan @default(FREE)
  subscriptionEnd DateTime?
  monthlyQuota    Int              @default(20) // Maksimal transaksi per bulan
  isAdmin         Boolean          @default(false)

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

## 3. Sistem Membership & Kuota Transaksi Bulanan

Setiap user memiliki kuota pencatatan transaksi yang dihitung dari awal bulan berjalan (tanggal 1 s/d akhir bulan):

| Paket | Default Kuota | Masa Aktif | Keterangan |
|---|---|---|---|
| **FREE** | **20 transaksi** / bulan | Selamanya | Default untuk user baru |
| **PRO** | **200 transaksi** / bulan | 30 Hari | Dapat di-custom batas kuotanya oleh Admin |
| **UNLIMITED** | **Tanpa Batas ($\infty$)** | 30 Hari | Kuota tak terhingga |

---

## 4. Cara Aktivasi & Mengatur Kuota (Khusus Admin)

Admin dapat mengaktifkan paket atau mengubah kuota user melalui 2 cara:

### Cara A: Langsung via Chat WhatsApp Admin *(Paling Praktis)*
Kirim chat ke bot dari nomor Admin atau nomor akun bot sendiri:

1. **Upgrade Paket User (30 hari)**:
   ```text
   !upgrade 628123456789 30 PRO
   !upgrade 628123456789 30 UNLIMITED
   ```
2. **Upgrade Paket dengan Custom Kuota**:
   ```text
   !upgrade 628123456789 30 PRO 500
   ```
   *(Mengaktifkan paket PRO untuk nomor tersebut dengan kuota 500 transaksi selama 30 hari).*
3. **Ubah Batas Kuota Bulanan Saja**:
   ```text
   !setkuota 628123456789 100
   ```
   *(Mengubah batas kuota nomor tersebut menjadi 100 transaksi/bulan).*

---

### Cara B: Melalui REST API Admin (`POST /api/admin/subscription`)

#### Request:
```bash
curl -X POST http://localhost:3000/api/admin/subscription \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "628123456789",
    "plan": "PRO",
    "durationDays": 30,
    "customQuota": 300
  }'
```

#### Response:
```json
{
  "success": true,
  "message": "Subscription for 628123456789 successfully updated to PRO",
  "user": {
    "phoneNumber": "628123456789",
    "plan": "PRO",
    "monthlyQuota": 300,
    "subscriptionEnd": "2026-10-27T23:20:00.000Z"
  }
}
```

---

## 5. Perintah WhatsApp Pengguna

| Perintah | Deskripsi |
|---|---|
| `Parkir 2000` | Catat pengeluaran (cek sisa kuota) |
| `+5000000 Gaji` | Catat pemasukan (cek sisa kuota) |
| `rekap` | Lihat total saldo & breakdown per kategori |
| `status` / `kuota` | Cek sisa kuota, pemakaian bulan ini, dan masa aktif paket |
| `paket` / `harga` | Info harga dan paket membership |
| `bantuan` | Menampilkan menu bantuan |

---

## 6. API Endpoints

- `POST /api/transactions` : Catat transaksi (dengan validasi kuota bulanan).
- `GET /api/transactions` : Ambil daftar transaksi user.
- `GET /api/transactions/summary` : Rekapitulasi keuangan & per kategori.
- `GET /api/categories` : Daftar kategori transaksi.
- `POST /api/admin/subscription` : Atur paket & kuota user oleh Admin.
- `GET /api/admin/subscription` : Lihat status pemakaian kuota semua user.
