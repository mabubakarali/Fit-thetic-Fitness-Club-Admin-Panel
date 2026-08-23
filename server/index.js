import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fit-thetic-gym-super-secret-key-2026';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ----------------------------------------------------
// Database Connection (MongoDB Atlas + Dev Storage)
// ----------------------------------------------------
let mongoClient = null;
let mongoDb = null;
let useEmbedded = true;

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadEmbeddedDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading db.json:', e);
  }
  return {
    users: {},
    gym_settings: {},
    members: {},
    membership_plans: {},
    memberships: {},
    payments: {},
    receipts: {},
    whatsapp_reminders: {},
  };
}

function saveEmbeddedDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing db.json:', e);
  }
}

let embeddedStore = loadEmbeddedDb();

// Seed initial admin user if not present
const DEFAULT_ADMIN_EMAIL = 'dawood@gmail.com';
const DEFAULT_ADMIN_PASSWORD_HASH = bcrypt.hashSync('1234', 10);

async function initDatabase() {
  if (MONGODB_URI) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      mongoDb = mongoClient.db(process.env.MONGODB_DB_NAME || 'fit_thetic_gym');
      useEmbedded = false;
      console.log('✅ Connected to MongoDB Atlas successfully!');

      // Ensure index on updated_at and deleted_at for fast incremental pull
      const collections = [
        'members',
        'memberships',
        'payments',
        'receipts',
        'membership_plans',
        'whatsapp_reminders',
        'gym_settings',
      ];
      for (const colName of collections) {
        await mongoDb.collection(colName).createIndex({ updated_at: 1 });
        await mongoDb.collection(colName).createIndex({ deleted_at: 1 });
      }

      // Ensure default admin user in MongoDB
      const usersCol = mongoDb.collection('users');
      const existingAdmin = await usersCol.findOne({ email: DEFAULT_ADMIN_EMAIL });
      if (!existingAdmin) {
        await usersCol.insertOne({
          _id: 'admin-001',
          email: DEFAULT_ADMIN_EMAIL,
          password_hash: DEFAULT_ADMIN_PASSWORD_HASH,
          full_name: 'Dawood Janjua',
          role: 'owner',
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('⚠️ MongoDB Atlas connection failed, falling back to Local Development Storage:', err.message);
      useEmbedded = true;
    }
  } else {
    console.log('ℹ️ No MONGODB_URI in environment. Using Local Development Storage (./data/db.json).');
    useEmbedded = true;
  }

  // Ensure default admin in embedded store
  if (useEmbedded) {
    if (!embeddedStore.users) embeddedStore.users = {};
    if (!embeddedStore.users['admin-001']) {
      embeddedStore.users['admin-001'] = {
        id: 'admin-001',
        email: DEFAULT_ADMIN_EMAIL,
        password_hash: DEFAULT_ADMIN_PASSWORD_HASH,
        full_name: 'Dawood Janjua',
        role: 'owner',
        created_at: new Date().toISOString(),
      };
      saveEmbeddedDb(embeddedStore);
    }
  }
}

// ----------------------------------------------------
// Authentication & Security Middleware
// ----------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Bearer token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: useEmbedded ? 'Local Development Storage' : 'MongoDB Atlas Cloud',
    database: useEmbedded ? 'db.json' : 'MongoDB Atlas',
    timestamp: new Date().toISOString(),
  });
});

// Admin Login Endpoint
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    let user = null;
    if (!useEmbedded && mongoDb) {
      user = await mongoDb.collection('users').findOne({ email: email.toLowerCase().trim() });
    } else {
      user = Object.values(embeddedStore.users || {}).find(
        (u) => u.email.toLowerCase() === email.toLowerCase().trim()
      );
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Sign JWT Token (7 days validity)
    const token = jwt.sign(
      {
        userId: user._id || user.id,
        email: user.email,
        role: user.role || 'owner',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ----------------------------------------------------
// SYNCHRONIZATION: BATCH PUSH
// ----------------------------------------------------
app.post('/api/sync/push', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    let pushed = 0;
    const nowIso = new Date().toISOString();

    if (!useEmbedded && mongoDb) {
      for (const item of items) {
        const collection = mongoDb.collection(item.entity);
        const recordId = String(item.entity_id || item.payload?.id);

        if (item.operation === 'DELETE') {
          // Record Tombstone (Never resurrect)
          await collection.updateOne(
            { _id: recordId },
            {
              $set: {
                deleted_at: item.payload?.deleted_at || nowIso,
                deleted_by: item.device_id || 'remote',
                updated_at: nowIso,
              },
            },
            { upsert: true }
          );
          if (item.entity === 'members') {
            await mongoDb.collection('memberships').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
            await mongoDb.collection('payments').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
            await mongoDb.collection('receipts').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
          }
          pushed++;
        } else if (item.entity === 'payments' || item.entity === 'receipts') {
          // FINANCIAL RECORDS: Append-only / Idempotent Insert (Never overwrite)
          const doc = {
            ...item.payload,
            _id: recordId,
            id: recordId,
            created_at: item.payload?.created_at || nowIso,
          };
          // $setOnInsert ensures existing financial audit records are NEVER altered or duplicated
          await collection.updateOne(
            { _id: recordId },
            { $setOnInsert: doc },
            { upsert: true }
          );
          pushed++;
        } else {
          // MUTABLE RECORDS (Members, Plans, Memberships, Settings): LWW based on updated_at
          const doc = {
            ...item.payload,
            _id: recordId,
            id: recordId,
            updated_at: item.payload?.updated_at || nowIso,
          };
          // Query if existing record is newer
          const existing = await collection.findOne({ _id: recordId });
          if (!existing || !existing.updated_at || new Date(doc.updated_at) >= new Date(existing.updated_at)) {
            await collection.replaceOne({ _id: recordId }, doc, { upsert: true });
          }
          pushed++;
        }
      }
    } else {
      // Local Development Storage
      for (const item of items) {
        const entity = item.entity;
        if (!embeddedStore[entity]) embeddedStore[entity] = {};

        const recordId = String(item.entity_id || item.payload?.id);

        if (item.operation === 'DELETE') {
          if (!embeddedStore[entity][recordId]) {
            embeddedStore[entity][recordId] = { id: recordId };
          }
          embeddedStore[entity][recordId].deleted_at = item.payload?.deleted_at || nowIso;
          embeddedStore[entity][recordId].updated_at = nowIso;
          pushed++;
        } else if (entity === 'payments' || entity === 'receipts') {
          // Immutable Financial record (do not overwrite if already present)
          if (!embeddedStore[entity][recordId]) {
            embeddedStore[entity][recordId] = {
              ...item.payload,
              id: recordId,
              created_at: item.payload?.created_at || nowIso,
            };
          }
          pushed++;
        } else {
          // LWW for editable records
          const existing = embeddedStore[entity][recordId];
          const payloadUpdated = item.payload?.updated_at || nowIso;
          if (!existing || !existing.updated_at || new Date(payloadUpdated) >= new Date(existing.updated_at)) {
            embeddedStore[entity][recordId] = {
              ...item.payload,
              id: recordId,
              updated_at: payloadUpdated,
            };
          }
          pushed++;
        }
      }
      saveEmbeddedDb(embeddedStore);
    }

    res.json({
      success: true,
      pushed,
      timestamp: nowIso,
      mode: useEmbedded ? 'Local Development Storage' : 'MongoDB Atlas',
    });
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// SYNCHRONIZATION: INCREMENTAL PULL
// ----------------------------------------------------
app.get('/api/sync/pull', authMiddleware, async (req, res) => {
  try {
    const { since } = req.query;
    const collections = [
      'gym_settings',
      'membership_plans',
      'members',
      'memberships',
      'payments',
      'receipts',
      'whatsapp_reminders',
    ];

    const result = {};

    if (!useEmbedded && mongoDb) {
      for (const colName of collections) {
        let filter = {};
        if (since && typeof since === 'string' && since.trim() !== '') {
          filter = {
            $or: [
              { updated_at: { $gt: since } },
              { deleted_at: { $gt: since } },
              { created_at: { $gt: since } },
            ],
          };
        }

        const docs = await mongoDb.collection(colName).find(filter).toArray();
        result[colName] = docs.map((d) => {
          const { _id, ...rest } = d;
          return { id: _id, ...rest };
        });
      }
    } else {
      for (const colName of collections) {
        const allItems = Object.values(embeddedStore[colName] || {});
        if (since && typeof since === 'string' && since.trim() !== '') {
          result[colName] = allItems.filter((item) => {
            const up = item.updated_at || item.created_at || '';
            const del = item.deleted_at || '';
            return up > since || del > since;
          });
        } else {
          result[colName] = allItems;
        }
      }
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      mode: useEmbedded ? 'Local Development Storage' : 'MongoDB Atlas',
    });
  } catch (err) {
    console.error('Pull error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Fit-Thetic Sync Server running on port ${PORT}`);
  });
});
