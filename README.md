# Fit-Thetic Fitness Club - Admin Portal & Sync Engine

A modern, high-performance gym management platform built with React, TypeScript, Vite, Tailwind CSS, IndexedDB, and an offline-first synchronization engine backed by Node.js + MongoDB.

---

## 🌟 Key Capabilities

- **100% Offline-First**: Works seamlessly without an internet connection using persistent IndexedDB storage.
- **Bi-Directional Cloud Synchronization**: Automatic background synchronization across Windows desktop application, Mobile/PWA, and Browser.
- **Financial Audit Immutability**: Payments and receipts are append-only with stable idempotency keys (no duplicate transactions).
- **Automated WhatsApp Reminders**: Direct WhatsApp message generation for renewals and payment receipts.
- **Tombstone Deletion Engine**: Prevents resurrection of deleted records across offline devices.
- **Standalone Windows Executable**: Bundled single-file `.exe` with zero installation hurdles.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Sync Server & Development App
```bash
# Start the Sync Server (Port 5000)
npm run server

# Start the Vite App (Port 5173)
npm run dev
```

### 3. Build Desktop Application
```bash
npm run build
```

---

## ☁️ Deployment (Render.com / Docker)

1. Connect this repository to [Render.com](https://render.com).
2. Select **Web Service** (Render automatically detects `render.yaml` & `Dockerfile`).
3. Set your environment variables in Render:
   - `JWT_SECRET`: Random secure string
   - `MONGODB_URI`: (Optional) MongoDB Atlas connection string
4. In your client app, enter your Render HTTPS URL in **Settings &rarr; Cloud Backend API URL**.
