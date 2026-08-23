import { getDB, putInStore, deleteFromStore, getFromStore } from './idb';
import { generateUUID } from './uuid';
import { getDeviceId } from './deviceId';
import {
  SyncQueueItem,
  SyncEntity,
  SyncOperationType,
  SyncState,
  Member,
  Membership,
  Payment,
  Receipt,
  MembershipPlan,
  WhatsAppReminder,
  GymSettings
} from '@/types/database';

type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

const DEFAULT_API_URL =
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
    ? window.location.origin
    : (import.meta as any).env?.VITE_API_URL || 'https://fit-thetic.vercel.app';

export function getApiUrl(): string {
  return localStorage.getItem('fit_thetic_api_url') || DEFAULT_API_URL;
}

export function setApiUrl(url: string) {
  localStorage.setItem('fit_thetic_api_url', url.trim());
}

export function getAuthToken(): string | null {
  return localStorage.getItem('fit_thetic_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('fit_thetic_auth_token', token);
  } else {
    localStorage.removeItem('fit_thetic_auth_token');
  }
}

export function setSyncContext(
  mode: 'offline_standalone' | 'cloud_synced',
  gymId?: string | null,
  gymName?: string | null
) {
  currentState.mode = mode;
  notifyListeners();
  if (mode === 'cloud_synced' && typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue();
  }
}

let currentState: SyncState = {
  mode: 'cloud_synced',
  is_online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  is_syncing: false,
  last_synced_at: localStorage.getItem('fit_thetic_last_synced'),
  pending_count: 0,
  failed_count: 0,
  device_id: getDeviceId(),
  error: null,
};

export function subscribeToSync(listener: SyncListener) {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l({ ...currentState }));
}

/**
 * Enqueue a mutation to local IndexedDB sync queue
 */
export async function enqueueSync(
  entity: SyncEntity,
  entityId: string,
  operation: SyncOperationType,
  payload: Record<string, any>
): Promise<void> {
  const db = await getDB();
  const deviceId = getDeviceId();

  const item: SyncQueueItem = {
    id: generateUUID(),
    gym_id: 'default_gym',
    device_id: deviceId,
    entity,
    entity_id: String(entityId),
    operation,
    payload: {
      ...payload,
      id: String(entityId),
      updated_by: deviceId,
      updated_at: payload.updated_at || new Date().toISOString(),
    },
    timestamp: Date.now(),
    status: 'pending',
    retry_count: 0,
  };

  await db.put('sync_queue', item);
  await updateQueueCounts();

  // If online, attempt background sync
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processSyncQueue();
  }
}

/**
 * Update sync queue counts for reactive UI
 */
export async function updateQueueCounts(): Promise<void> {
  try {
    const db = await getDB();
    const all = await db.getAll('sync_queue');
    const pending = all.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
    const failed = all.filter((i) => i.status === 'failed').length;
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    currentState.pending_count = pending;
    currentState.failed_count = failed;
    currentState.is_online = online;
    notifyListeners();
  } catch (err) {
    console.error('Error updating queue counts:', err);
  }
}

/**
 * Process Push and Pull synchronization against HTTPS Backend API
 */
export async function processSyncQueue(): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  errors: number;
  errorMessage?: string;
}> {
  if (currentState.is_syncing) {
    return { success: false, pushed: 0, pulled: 0, errors: 0 };
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    currentState.is_online = false;
    currentState.is_syncing = false;
    notifyListeners();
    return { success: false, pushed: 0, pulled: 0, errors: 0, errorMessage: 'Device offline' };
  }

  currentState.is_syncing = true;
  currentState.error = null;
  notifyListeners();

  let pushed = 0;
  let pulled = 0;
  let errors = 0;
  let lastErrorMsg = '';

  const apiUrl = getApiUrl();
  let token = getAuthToken();

  // If token is missing, attempt auto-login with default credentials
  if (!token) {
    try {
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dawood@gmail.com', password: '1234' }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.token) {
          token = loginData.token;
          setAuthToken(token);
        }
      }
    } catch {
      // Backend not reachable
    }
  }

  try {
    const db = await getDB();

    // =========================================================================
    // 1. PUSH PHASE: Upload pending local mutations to cloud
    // =========================================================================
    const queue = await db.getAllFromIndex('sync_queue', 'by-timestamp');
    const pendingItems = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

    if (pendingItems.length > 0 && token) {
      try {
        const pushRes = await fetch(`${apiUrl}/api/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: pendingItems }),
        });

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          if (pushData.success) {
            // Remove successfully pushed items from local IndexedDB queue
            for (const item of pendingItems) {
              await db.delete('sync_queue', item.id);
            }
            pushed = pendingItems.length;
          } else {
            throw new Error(pushData.error || 'Push failed');
          }
        } else {
          throw new Error(`Push HTTP ${pushRes.status}: ${pushRes.statusText}`);
        }
      } catch (pushErr: any) {
        console.warn('Push error:', pushErr);
        errors = pendingItems.length;
        lastErrorMsg = pushErr?.message || 'Sync push failed';
      }
    }

    // =========================================================================
    // 2. PULL PHASE: Incremental pull from cloud
    // =========================================================================
    if (token) {
      try {
        const lastSynced = localStorage.getItem('fit_thetic_last_synced') || '';
        const pullRes = await fetch(`${apiUrl}/api/sync/pull?since=${encodeURIComponent(lastSynced)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (pullRes.ok) {
          const { data, timestamp } = await pullRes.json();
          if (data) {
            // 2a. Membership Plans
            if (data.membership_plans && Array.isArray(data.membership_plans)) {
              for (const item of data.membership_plans) {
                const local = await getFromStore<MembershipPlan>('membership_plans', item.id);
                if (item.deleted_at) {
                  if (local) await deleteFromStore('membership_plans', item.id);
                } else if (!local || !local.updated_at || new Date(item.updated_at) >= new Date(local.updated_at)) {
                  await putInStore('membership_plans', item);
                  pulled++;
                }
              }
            }

            // 2b. Members (With Tombstones)
            if (data.members && Array.isArray(data.members)) {
              for (const item of data.members) {
                const local = await getFromStore<Member>('members', item.id);
                if (item.deleted_at) {
                  if (local) await deleteFromStore('members', item.id);
                } else if (!local || !local.updated_at || new Date(item.updated_at) >= new Date(local.updated_at)) {
                  await putInStore('members', item);
                  pulled++;
                }
              }
            }

            // 2c. Memberships (With Tombstones)
            if (data.memberships && Array.isArray(data.memberships)) {
              for (const item of data.memberships) {
                const local = await getFromStore<Membership>('memberships', item.id);
                if (item.deleted_at) {
                  if (local) await deleteFromStore('memberships', item.id);
                } else if (!local || !local.updated_at || new Date(item.updated_at) >= new Date(local.updated_at)) {
                  await putInStore('memberships', item);
                  pulled++;
                }
              }
            }

            // 2d. Payments (Immutable Audit Records)
            if (data.payments && Array.isArray(data.payments)) {
              for (const item of data.payments) {
                const local = await getFromStore<Payment>('payments', item.id);
                if (!local) {
                  await putInStore('payments', item);
                  pulled++;
                }
              }
            }

            // 2e. Receipts (Immutable Audit Records)
            if (data.receipts && Array.isArray(data.receipts)) {
              for (const item of data.receipts) {
                const local = await getFromStore<Receipt>('receipts', item.id);
                if (!local) {
                  await putInStore('receipts', item);
                  pulled++;
                }
              }
            }

            // 2f. Gym Settings
            if (data.gym_settings && Array.isArray(data.gym_settings) && data.gym_settings.length > 0) {
              const remoteSettings = data.gym_settings[0];
              if (remoteSettings) {
                await putInStore('gym_settings', remoteSettings);
              }
            }

            // Update timestamp cursor
            if (timestamp) {
              localStorage.setItem('fit_thetic_last_synced', timestamp);
              currentState.last_synced_at = timestamp;
            }
          }
        }
      } catch (pullErr: any) {
        console.warn('Pull error:', pullErr);
      }
    }

    currentState.is_syncing = false;
    currentState.error = errors > 0 ? lastErrorMsg : null;
    await updateQueueCounts();
    notifyListeners();

    return {
      success: errors === 0,
      pushed,
      pulled,
      errors,
      errorMessage: lastErrorMsg,
    };
  } catch (err: any) {
    console.error('Fatal sync process error:', err);
    currentState.is_syncing = false;
    currentState.error = err?.message || 'Sync error';
    notifyListeners();
    return { success: false, pushed, pulled, errors: errors + 1, errorMessage: err?.message };
  }
}
