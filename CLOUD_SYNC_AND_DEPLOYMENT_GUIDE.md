# Fit-Thetic Fitness Club - Cloud Sync & Multi-Tenant Deployment Guide

This document provides complete instructions for configuring, operating, and deploying the **Fit-Thetic Gym Management System** with optional multi-device cloud synchronization and multi-tenant PostgreSQL Row-Level Security (RLS).

---

## 1. Architectural Overview

```
+--------------------------------------------------------------------------------+
|                                FIT-THETIC APP                                  |
|   - Standalone Windows .exe   OR   - Cloud-Synced Web / Mobile Browser         |
+---------------------------------------+----------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | (Always Reads/Writes Locally)               | (When Cloud Sync Active)
                 v                                             v
     +-----------------------+                     +-----------------------+
     |   IndexedDB Engine    |                     |   Push/Pull Engine    |
     | - members             |                     | - Offline Sync Queue  |
     | - payments            |                     | - Idempotent Upserts  |
     | - receipts            |                     | - Tombstone Deletions |
     | - plans               |                     +-----------+-----------+
     +-----------------------+                                 |
                                                               v
                                                   +-----------------------+
                                                   |  Supabase Multi-Tenant|
                                                   |  PostgreSQL with RLS  |
                                                   | - Gym A (Tenant 1)    |
                                                   | - Gym B (Tenant 2)    |
                                                   | - Gym C (Tenant 3)    |
                                                   +-----------------------+
```

### Core Tenets:
1. **Offline Standalone First**: If no cloud credentials are configured, the app operates 100% locally with zero cloud dependencies or network requests.
2. **Multi-Tenant Single Project**: All gyms live in one shared database. PostgreSQL Row-Level Security (RLS) automatically enforces complete data isolation between gyms.
3. **Immutable Financial Records**: Payments and receipts use unique UUIDs and append-only rules to guarantee zero duplicate transactions across retried sync runs.
4. **Tombstone Deletion Sync**: Deletions recorded on one device are propagated via tombstones (`deleted_at`), ensuring offline devices never resurrect deleted records.

---

## 2. Creating the Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project (e.g. `fit-thetic-cloud`).
2. Set a secure database password and select your preferred region.
3. Once the database is provisioned, navigate to **SQL Editor** in the Supabase Dashboard.
4. Open the migration file:
   [`supabase/migrations/20260823000001_multitenant_schema.sql`](file:///c:/Users/oreo/Downloads/Fit-thetic%20Gym/supabase/migrations/20260823000001_multitenant_schema.sql)
5. Paste the entire SQL script and click **Run**.
   - This creates all tenant-owned tables (`gyms`, `gym_users`, `members`, `membership_plans`, `memberships`, `payments`, `receipts`, `whatsapp_reminders`, `sync_operations`).
   - Enables RLS on all tables and configures `get_auth_gym_id()`.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the root folder:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!IMPORTANT]
> - Never use the `service_role` secret in `.env` or client-side code.
> - Only use the public `anon` key.
> - If `VITE_SUPABASE_URL` is omitted or empty, the application automatically runs in **Offline Standalone Mode**.

---

## 4. How Authentication & Tenant Mapping Works

1. **User Sign Up**: When an admin registers with email, password, full name, and gym name:
   - Supabase Auth creates an `auth.users` record.
   - A new row is inserted into `gyms`.
   - A row is inserted into `gym_users(user_id, gym_id, role)`.
2. **User Sign In**:
   - Supabase verifies password credentials.
   - The app looks up `gym_users WHERE user_id = auth.uid()`.
   - The database function `get_auth_gym_id()` returns the active `gym_id` for all queries.
3. **Adding Additional Staff/Trainers to the Same Gym**:
   - Create a user in `gym_users` with the same `gym_id` and their `user_id`.
   - Both devices now automatically share and synchronize that gym's data.
4. **Adding Another Gym (e.g. Gym B)**:
   - A second gym owner signs up with their own credentials and gym name.
   - Supabase assigns a distinct `gym_id`.
   - Gym B will **never** see or modify Gym A's members or payments.

---

## 5. Offline Push/Pull Sync Workflow

1. **Local Mutation**:
   - Admin adds a member or records a payment on laptop.
   - Record is stored immediately in IndexedDB with a standard UUID and `gym_id`.
   - A pending entry is added to `sync_queue`.
2. **Push Phase**:
   - When connected, `processSyncQueue()` sends idempotent upserts (`ON CONFLICT (id)`) to Supabase.
   - On success, the item is removed from `sync_queue`.
3. **Pull Phase**:
   - The app downloads remote records matching `WHERE gym_id = get_auth_gym_id()`.
   - If `deleted_at` is set on remote record, it is deleted from local IndexedDB.
   - If `updated_at` is newer, it updates local record.
   - Financial payments and receipts are immutable and never duplicated.

---

## 6. How to Test Two-Device Synchronization

### Step 1: Start Device A (Laptop / Browser 1)
1. Open [http://localhost:5173/](http://localhost:5173/) or open `Fit-Thetic-Fitness-Club.exe`.
2. Sign in or register your cloud gym account.
3. Turn on Offline Mode (e.g. disconnect Wi-Fi or toggle browser DevTools Offline).
4. Register **Member A** (`Zubair Khan`) and record a Rs. 3,000 payment.

### Step 2: Start Device B (Phone / Browser 2 / Incognito)
1. Open another browser profile or incognito window at [http://localhost:5173/](http://localhost:5173/).
2. Sign in with the **same gym account**.
3. Turn on Offline Mode.
4. Register **Member B** (`Hamza Ali`) and record a Rs. 2,500 payment.

### Step 3: Reconnect Both Devices
1. Turn Wi-Fi back on Device A & Device B.
2. Click **Sync Now** or watch the sync indicator change to **Online — Synced**.
3. **Result**:
   - Both Device A and Device B now contain both **Member A** and **Member B**.
   - All payments exist exactly once with no duplicates.

---

## 7. Deployment Instructions

### Option A: Standalone Windows Desktop Executable (`.exe`)
1. Run the build & compile script:
   ```powershell
   npm run build
   & "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /win32icon:"app_icon.ico" /resource:dist.zip,dist.zip /resource:app_icon.ico,app_icon.ico /r:"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.IO.Compression.FileSystem.dll" /r:"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.IO.Compression.dll" /out:"Fit-Thetic-Fitness-Club.exe" launcher.cs
   ```
2. Copy `Fit-Thetic-Fitness-Club.exe` (3 MB) directly to a USB stick.
3. Plug into any laptop and double-click to launch in full screen.

### Option B: Cloud Web Deployment (Vercel / Netlify / VPS)
1. Push this repository to GitHub / GitLab.
2. Connect repository to Vercel or Netlify.
3. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build command: `npm run build`
5. Output directory: `dist`
