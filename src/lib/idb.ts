import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Member,
  MembershipPlan,
  Membership,
  Payment,
  Receipt,
  WhatsAppReminder,
  GymSettings,
  SyncQueueItem,
  Gym,
  GymUser
} from '@/types/database';

export interface FitTheticDB extends DBSchema {
  gyms: {
    key: string;
    value: Gym;
  };
  gym_users: {
    key: string;
    value: GymUser;
    indexes: { 'by-user': string; 'by-gym': string };
  };
  members: {
    key: string;
    value: Member;
    indexes: { 'by-code': string; 'by-phone': string; 'by-status': string; 'by-gym': string; 'by-deleted': string };
  };
  membership_plans: {
    key: string;
    value: MembershipPlan;
    indexes: { 'by-gym': string; 'by-deleted': string };
  };
  memberships: {
    key: string;
    value: Membership;
    indexes: { 'by-member': string; 'by-status': string; 'by-end-date': string; 'by-gym': string; 'by-deleted': string };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { 'by-member': string; 'by-membership': string; 'by-date': string; 'by-gym': string; 'by-deleted': string };
  };
  receipts: {
    key: string;
    value: Receipt;
    indexes: { 'by-payment': string; 'by-number': string; 'by-gym': string; 'by-deleted': string };
  };
  whatsapp_reminders: {
    key: string;
    value: WhatsAppReminder;
    indexes: { 'by-member': string; 'by-membership': string; 'by-gym': string };
  };
  gym_settings: {
    key: string;
    value: GymSettings;
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-status': string; 'by-timestamp': number; 'by-gym': string };
  };
}

const DB_NAME = 'fit-thetic-gym-db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<FitTheticDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FitTheticDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FitTheticDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        try {
          // Gyms Store
          if (!db.objectStoreNames.contains('gyms')) {
            db.createObjectStore('gyms', { keyPath: 'id' });
          }

          // Gym Users Store
          if (!db.objectStoreNames.contains('gym_users')) {
            const guStore = db.createObjectStore('gym_users', { keyPath: 'id' });
            guStore.createIndex('by-user', 'user_id');
            guStore.createIndex('by-gym', 'gym_id');
          }

          // Members Store
          if (!db.objectStoreNames.contains('members')) {
            const memberStore = db.createObjectStore('members', { keyPath: 'id' });
            memberStore.createIndex('by-code', 'member_code');
            memberStore.createIndex('by-phone', 'phone');
            memberStore.createIndex('by-status', 'status');
            memberStore.createIndex('by-gym', 'gym_id');
            memberStore.createIndex('by-deleted', 'deleted_at');
          } else {
            try {
              const memberStore = transaction.objectStore('members');
              if (!memberStore.indexNames.contains('by-gym')) memberStore.createIndex('by-gym', 'gym_id');
              if (!memberStore.indexNames.contains('by-deleted')) memberStore.createIndex('by-deleted', 'deleted_at');
            } catch (e) {}
          }

          // Membership Plans Store
          if (!db.objectStoreNames.contains('membership_plans')) {
            const planStore = db.createObjectStore('membership_plans', { keyPath: 'id' });
            planStore.createIndex('by-gym', 'gym_id');
            planStore.createIndex('by-deleted', 'deleted_at');
          } else {
            try {
              const planStore = transaction.objectStore('membership_plans');
              if (!planStore.indexNames.contains('by-gym')) planStore.createIndex('by-gym', 'gym_id');
              if (!planStore.indexNames.contains('by-deleted')) planStore.createIndex('by-deleted', 'deleted_at');
            } catch (e) {}
          }

          // Memberships Store
          if (!db.objectStoreNames.contains('memberships')) {
            const membershipStore = db.createObjectStore('memberships', { keyPath: 'id' });
            membershipStore.createIndex('by-member', 'member_id');
            membershipStore.createIndex('by-status', 'status');
            membershipStore.createIndex('by-end-date', 'end_date');
            membershipStore.createIndex('by-gym', 'gym_id');
            membershipStore.createIndex('by-deleted', 'deleted_at');
          } else {
            try {
              const membershipStore = transaction.objectStore('memberships');
              if (!membershipStore.indexNames.contains('by-gym')) membershipStore.createIndex('by-gym', 'gym_id');
              if (!membershipStore.indexNames.contains('by-deleted')) membershipStore.createIndex('by-deleted', 'deleted_at');
            } catch (e) {}
          }

          // Payments Store
          if (!db.objectStoreNames.contains('payments')) {
            const paymentStore = db.createObjectStore('payments', { keyPath: 'id' });
            paymentStore.createIndex('by-member', 'member_id');
            paymentStore.createIndex('by-membership', 'membership_id');
            paymentStore.createIndex('by-date', 'payment_date');
            paymentStore.createIndex('by-gym', 'gym_id');
            paymentStore.createIndex('by-deleted', 'deleted_at');
          } else {
            try {
              const paymentStore = transaction.objectStore('payments');
              if (!paymentStore.indexNames.contains('by-gym')) paymentStore.createIndex('by-gym', 'gym_id');
              if (!paymentStore.indexNames.contains('by-deleted')) paymentStore.createIndex('by-deleted', 'deleted_at');
            } catch (e) {}
          }

          // Receipts Store
          if (!db.objectStoreNames.contains('receipts')) {
            const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
            receiptStore.createIndex('by-payment', 'payment_id');
            receiptStore.createIndex('by-number', 'receipt_number');
            receiptStore.createIndex('by-gym', 'gym_id');
            receiptStore.createIndex('by-deleted', 'deleted_at');
          } else {
            try {
              const receiptStore = transaction.objectStore('receipts');
              if (!receiptStore.indexNames.contains('by-gym')) receiptStore.createIndex('by-gym', 'gym_id');
              if (!receiptStore.indexNames.contains('by-deleted')) receiptStore.createIndex('by-deleted', 'deleted_at');
            } catch (e) {}
          }

          // WhatsApp Reminders Store
          if (!db.objectStoreNames.contains('whatsapp_reminders')) {
            const reminderStore = db.createObjectStore('whatsapp_reminders', { keyPath: 'id' });
            reminderStore.createIndex('by-member', 'member_id');
            reminderStore.createIndex('by-membership', 'membership_id');
            reminderStore.createIndex('by-gym', 'gym_id');
          } else {
            try {
              const reminderStore = transaction.objectStore('whatsapp_reminders');
              if (!reminderStore.indexNames.contains('by-gym')) reminderStore.createIndex('by-gym', 'gym_id');
            } catch (e) {}
          }

          // Gym Settings Store
          if (!db.objectStoreNames.contains('gym_settings')) {
            db.createObjectStore('gym_settings', { keyPath: 'id' });
          }

          // Sync Queue Store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            syncStore.createIndex('by-status', 'status');
            syncStore.createIndex('by-timestamp', 'timestamp');
            syncStore.createIndex('by-gym', 'gym_id');
          } else {
            try {
              const syncStore = transaction.objectStore('sync_queue');
              if (!syncStore.indexNames.contains('by-gym')) syncStore.createIndex('by-gym', 'gym_id');
            } catch (e) {}
          }
        } catch (upgradeErr) {
          console.error('IDB upgrade error:', upgradeErr);
        }
      },
      blocked() {
        console.warn('IDB version change blocked by another tab.');
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then((db) => db.close());
          dbPromise = null;
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllFromStore<T>(storeName: keyof FitTheticDB): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName as any) as Promise<T[]>;
}

export async function getNonDeletedFromStore<T extends { deleted_at?: string | null; gym_id?: string }>(
  storeName: keyof FitTheticDB,
  gymId?: string
): Promise<T[]> {
  const all = await getAllFromStore<T>(storeName);
  return all.filter((item) => {
    if (item.deleted_at) return false;
    if (gymId && item.gym_id && item.gym_id !== gymId) return false;
    return true;
  });
}

export async function getFromStore<T>(storeName: keyof FitTheticDB, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName as any, id) as Promise<T | undefined>;
}

export async function putInStore<T>(storeName: keyof FitTheticDB, value: T): Promise<IDBValidKey> {
  const db = await getDB();
  return db.put(storeName as any, value);
}

export async function putBatchInStore<T>(storeName: keyof FitTheticDB, values: T[]): Promise<void> {
  if (!values.length) return;
  const db = await getDB();
  const tx = db.transaction(storeName as any, 'readwrite');
  await Promise.all([...values.map((val) => tx.store.put(val)), tx.done]);
}

export async function deleteFromStore(storeName: keyof FitTheticDB, id: string): Promise<void> {
  const db = await getDB();
  return db.delete(storeName as any, id);
}

export async function clearStore(storeName: keyof FitTheticDB): Promise<void> {
  const db = await getDB();
  return db.clear(storeName as any);
}

export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  const storeNames: (keyof FitTheticDB)[] = [
    'gyms',
    'gym_users',
    'members',
    'membership_plans',
    'memberships',
    'payments',
    'receipts',
    'whatsapp_reminders',
    'gym_settings',
    'sync_queue',
  ];
  const tx = db.transaction(storeNames as any, 'readwrite');
  await Promise.all([...storeNames.map((name) => tx.objectStore(name as any).clear()), tx.done]);
}
