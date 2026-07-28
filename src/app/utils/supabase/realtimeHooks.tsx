import { useEffect, useRef, useCallback } from 'react';
import { subscribeToResource, type RealtimeEvent } from './realtime';

/**
 * Hook to subscribe to realtime updates for a resource
 * Batches rapid events using requestAnimationFrame to prevent render storms
 */
export function useRealtimeSubscription<T extends { id: number | string }>(
  resource: 'projects' | 'tasks' | 'team' | 'vendors' | 'clients' | 'leads' | 'inventory' | 'transactions' | 'activities' | 'qc_reviews' | 'phase_qc',
  onUpdate: (updater: (current: T[]) => T[]) => void,
  enabled: boolean = true
) {
  const eventQueue = useRef<RealtimeEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep onUpdate ref fresh
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const flushQueue = useCallback(() => {
    if (eventQueue.current.length === 0) {
      rafRef.current = null;
      return;
    }

    const events = [...eventQueue.current];
    eventQueue.current = [];

    onUpdateRef.current((current: T[]) => {
      let updated = [...current];
      const itemMap = new Map(updated.map(item => [item.id, item]));

      for (const event of events) {
        const [resourceType, action] = event.type.split(':') as [string, 'created' | 'updated' | 'deleted'];
        
        if (action === 'created' && event.data) {
          // Add new item if it doesn't exist
          if (!itemMap.has(event.data.id)) {
            itemMap.set(event.data.id, event.data as T);
          }
        } else if (action === 'updated' && event.data) {
          // Update existing item
          const existing = itemMap.get(event.data.id);
          if (existing) {
            itemMap.set(event.data.id, { ...existing, ...event.data } as T);
          } else {
            // Item doesn't exist locally, add it
            itemMap.set(event.data.id, event.data as T);
          }
        } else if (action === 'deleted' && event.data?.id) {
          // Remove deleted item
          itemMap.delete(event.data.id);
        }
      }

      return Array.from(itemMap.values());
    });

    rafRef.current = null;
  }, []);

  const handleEvent = useCallback((event: RealtimeEvent) => {
    eventQueue.current.push(event);
    
    // Schedule flush if not already scheduled
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushQueue);
    }
  }, [flushQueue]);

  useEffect(() => {
    if (!enabled) {
      console.log(`⏸️ Realtime subscription disabled for ${resource}`);
      return;
    }

    console.log(`🎧 Setting up realtime subscription for ${resource}`);
    const subscription = subscribeToResource(resource, handleEvent);

    return () => {
      console.log(`🛑 Cleaning up realtime subscription for ${resource}`);
      subscription.unsubscribe();
      
      // Cancel any pending flushes
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      // Clear event queue
      eventQueue.current = [];
    };
  }, [resource, handleEvent, enabled]);
}

/**
 * Hook to pause realtime updates when tab is hidden
 */
export function useRealtimePauseOnHidden() {
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (!document.hidden) {
        console.log('👁️ Tab visible - realtime updates active');
      } else {
        console.log('🙈 Tab hidden - realtime updates paused');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisibleRef;
}
