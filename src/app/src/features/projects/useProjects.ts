import { useState, useEffect, useCallback, useRef } from 'react';
import { listProjects, getProject } from './api';
import { registerSafetySync, subscribeScopedInvalidations } from '../../lib/scopedBroadcast';
import { mergeEntityById, removeEntityById } from '../../lib/entityCache';

export function useProjects(enabled = true, role = '', userId = '') {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const targetedFetches = useRef(new Set<string>());

  const mergeProject = useCallback((project: any) => {
    setRows((curr) => mergeEntityById(curr, project,
        (a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')
      ));
  }, []);

  const removeProject = useCallback((id: string | number) => {
    setRows((curr) => removeEntityById(curr, id));
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listProjects();
      setRows(data);
    } catch (error) {
      // Error refreshing projects
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }

    let off = () => {};
    let stopSafetySync = () => {};
    let subscribedOnce = false;

    const recover = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      listProjects(false).then(setRows).catch(() => {});
    };

    (async () => {
      try {
        const data = await listProjects();
        setRows(data);
        setLoading(false);

        off = subscribeScopedInvalidations(
          role,
          userId,
          (event) => {
            if (event.entity !== 'project') return;
            if (event.operation === 'DELETE') {
              removeProject(event.id);
              return;
            }
            if (targetedFetches.current.has(event.id)) return;
            targetedFetches.current.add(event.id);
            getProject(event.id)
              .then((project) => project ? mergeProject(project) : removeProject(event.id))
              .catch(() => {})
              .finally(() => targetedFetches.current.delete(event.id));
          },
          (status) => {
            if (status !== 'SUBSCRIBED') return;
            if (subscribedOnce) recover();
            subscribedOnce = true;
          }
        );
        stopSafetySync = registerSafetySync(recover);
      } catch (error) {
        setLoading(false);
      }
    })();

    return () => {
      off();
      stopSafetySync();
    };
  }, [enabled, mergeProject, removeProject, role, userId]);

  return { projects: rows, loading, refresh, mergeProject, removeProject };
}
