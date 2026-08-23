import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'fit-thetic-gym-super-secret-key-2026';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50mb' }));

let cachedClient = null;
let cachedDb = null;

async function getDatabase() {
  if (cachedDb) return cachedDb;
  if (!MONGODB_URI) return null;
  cachedClient = new MongoClient(MONGODB_URI);
  await cachedClient.connect();
  cachedDb = cachedClient.db(process.env.MONGODB_DB_NAME || 'fit_thetic_gym');
  return cachedDb;
}

// In-memory serverless cache
const memoryStore = {
  users: {
    'admin-001': {
      id: 'admin-001',
      email: 'dawood@gmail.com',
      password_hash: bcrypt.hashSync('1234', 10),
      full_name: 'Dawood Janjua',
      role: 'owner',
    },
  },
  members: {},
  membership_plans: {},
  memberships: {},
  payments: {},
  receipts: {},
  whatsapp_reminders: {},
  gym_settings: {},
};

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

// Health Check
app.get('/api/health', async (req, res) => {
  const db = await getDatabase();
  res.json({
    status: 'ok',
    mode: db ? 'MongoDB Atlas Cloud' : 'Serverless Cloud Storage',
    database: db ? 'MongoDB Atlas' : 'In-Memory Serverless',
    timestamp: new Date().toISOString(),
  });
});

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const db = await getDatabase();
    let user = null;
    if (db) {
      user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
    }
    if (!user) {
      user = Object.values(memoryStore.users).find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id || user.id, email: user.email, role: user.role || 'owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id || user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Batch Push
app.post('/api/sync/push', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }

    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    let pushed = 0;

    if (db) {
      for (const item of items) {
        const collection = db.collection(item.entity);
        const recordId = String(item.entity_id || item.payload?.id);

        if (item.operation === 'DELETE') {
          await collection.updateOne(
            { _id: recordId },
            { $set: { deleted_at: item.payload?.deleted_at || nowIso, deleted_by: item.device_id || 'remote', updated_at: nowIso } },
            { upsert: true }
          );
          if (item.entity === 'members') {
            await db.collection('memberships').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
            await db.collection('payments').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
            await db.collection('receipts').updateMany(
              { member_id: recordId },
              { $set: { deleted_at: nowIso, updated_at: nowIso } }
            );
          }
        } else if (item.entity === 'payments' || item.entity === 'receipts') {
          const doc = { ...item.payload, _id: recordId, id: recordId, created_at: item.payload?.created_at || nowIso };
          await collection.updateOne({ _id: recordId }, { $setOnInsert: doc }, { upsert: true });
        } else {
          const doc = { ...item.payload, _id: recordId, id: recordId, updated_at: item.payload?.updated_at || nowIso };
          await collection.replaceOne({ _id: recordId }, doc, { upsert: true });
        }
        pushed++;
      }
    } else {
      for (const item of items) {
        const entity = item.entity;
        if (!memoryStore[entity]) memoryStore[entity] = {};
        const recordId = String(item.entity_id || item.payload?.id);

        if (item.operation === 'DELETE') {
          if (!memoryStore[entity][recordId]) memoryStore[entity][recordId] = { id: recordId };
          memoryStore[entity][recordId].deleted_at = item.payload?.deleted_at || nowIso;
          memoryStore[entity][recordId].updated_at = nowIso;
        } else {
          memoryStore[entity][recordId] = { ...item.payload, id: recordId, updated_at: item.payload?.updated_at || nowIso };
        }
        pushed++;
      }
    }

    res.json({ success: true, pushed, timestamp: nowIso });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reliable Cloud Sync Pull
app.get('/api/sync/pull', authMiddleware, async (req, res) => {
  try {
    const collections = ['gym_settings', 'membership_plans', 'members', 'memberships', 'payments', 'receipts', 'whatsapp_reminders'];
    const db = await getDatabase();
    const result = {};

    if (db) {
      for (const colName of collections) {
        const docs = await db.collection(colName).find({}).toArray();
        result[colName] = docs.map((d) => {
          const { _id, ...rest } = d;
          return { id: _id, ...rest };
        });
      }
    } else {
      for (const colName of collections) {
        result[colName] = Object.values(memoryStore[colName] || {});
      }
    }

    res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
