type RequestKind = 'full-list' | 'targeted-record';

interface SyncMetricsState {
  startedAt: number;
  postgrestRequests: number;
  fullListRequests: number;
  targetedRecordRequests: number;
  activeChannels: number;
}

const state: SyncMetricsState = {
  startedAt: Date.now(),
  postgrestRequests: 0,
  fullListRequests: 0,
  targetedRecordRequests: 0,
  activeChannels: 0,
};

export function recordPostgrestRequest(kind: RequestKind) {
  if (!import.meta.env.DEV) return;
  state.postgrestRequests += 1;
  if (kind === 'full-list') state.fullListRequests += 1;
  else state.targetedRecordRequests += 1;
}

export function recordChannelOpened() {
  if (!import.meta.env.DEV) return;
  state.activeChannels += 1;
}

export function recordChannelClosed() {
  if (!import.meta.env.DEV) return;
  state.activeChannels = Math.max(0, state.activeChannels - 1);
}

export function getSyncMetrics() {
  const minutes = Math.max((Date.now() - state.startedAt) / 60000, 1 / 60);
  return {
    ...state,
    requestsPerMinute: Number((state.postgrestRequests / minutes).toFixed(2)),
  };
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__CSTLE_SYNC_METRICS__ = getSyncMetrics;
}
