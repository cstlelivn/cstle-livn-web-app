import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

// Local persistence for the work-session timer specifically -- NOT a full
// offline app shell (that's separate, later PWA work). This only has to
// survive a job site with no signal for a start/pause/resume/finish
// sequence and sync automatically once reconnected.

export interface PendingSessionAction {
  clientActionId: string; // idempotency key sent to the RPC as p_client_event_id
  type: 'start' | 'pause' | 'resume' | 'finish';
  taskId?: string; // for 'start'
  sessionId?: string; // real DB session id, once known
  localSessionKey?: string; // stand-in for a session created by a still-queued 'start'
  notes?: string;
  delayReason?: string;
  blocker?: string;
  clientEventAt: string; // ISO -- captured the moment the user actually tapped the button
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export interface LocalSessionOverlay {
  key: string; // `${taskId}:${teamMemberId}`
  localSessionKey: string;
  taskId: string;
  teamMemberId: string;
  status: 'running' | 'paused' | 'finished';
  activeSeconds: number;
  updatedAt: string;
  notes?: string;
  delayReason?: string;
  blocker?: string;
}

interface CstleOfflineDB extends DBSchema {
  pending_actions: {
    key: string;
    value: PendingSessionAction;
    indexes: { 'by-createdAt': string };
  };
  session_overlay: {
    key: string;
    value: LocalSessionOverlay;
  };
  session_key_map: {
    key: string; // localSessionKey
    value: { localSessionKey: string; realSessionId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<CstleOfflineDB>> | null = null;

function getDb() {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<CstleOfflineDB>('cstle-work-sessions', 1, {
      upgrade(db) {
        const actions = db.createObjectStore('pending_actions', { keyPath: 'clientActionId' });
        actions.createIndex('by-createdAt', 'createdAt');
        db.createObjectStore('session_overlay', { keyPath: 'key' });
        db.createObjectStore('session_key_map', { keyPath: 'localSessionKey' });
      },
    });
  }
  return dbPromise;
}

export async function addPendingAction(action: PendingSessionAction) {
  const db = await getDb();
  if (!db) return;
  await db.put('pending_actions', action);
}

export async function removePendingAction(clientActionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete('pending_actions', clientActionId);
}

export async function updatePendingAction(action: PendingSessionAction) {
  const db = await getDb();
  if (!db) return;
  await db.put('pending_actions', action);
}

export async function listPendingActions(): Promise<PendingSessionAction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAllFromIndex('pending_actions', 'by-createdAt');
}

export async function setSessionOverlay(entry: LocalSessionOverlay) {
  const db = await getDb();
  if (!db) return;
  await db.put('session_overlay', entry);
}

export async function clearSessionOverlay(key: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete('session_overlay', key);
}

export async function listSessionOverlays(): Promise<LocalSessionOverlay[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAll('session_overlay');
}

export async function mapLocalSessionKey(localSessionKey: string, realSessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.put('session_key_map', { localSessionKey, realSessionId });
}

export async function resolveLocalSessionKey(localSessionKey: string): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const row = await db.get('session_key_map', localSessionKey);
  return row?.realSessionId;
}
