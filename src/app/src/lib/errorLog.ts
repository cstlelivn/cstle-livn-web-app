import { createClient } from '../../utils/supabase/client.tsx';

const supabase = createClient();

// Persists a client-side crash to client_error_log (migration 20240024) so
// it's visible to managers/admins after the fact -- previously these only
// existed in whichever browser's devtools console happened to be open when
// it happened. Best-effort: if this itself fails (offline, RLS misconfig),
// it fails silently rather than compounding the original error.
export async function reportClientError(
  error: Error,
  context: { componentStack?: string | null; label?: string } = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('client_error_log').insert({
      user_id: user?.id ?? null,
      user_role: (user?.app_metadata as any)?.role ?? null,
      message: String(error?.message ?? error).slice(0, 2000),
      stack: error?.stack ? String(error.stack).slice(0, 4000) : null,
      component_stack: context.componentStack ? context.componentStack.slice(0, 4000) : null,
      label: context.label ?? null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // Best-effort only -- never let logging failure mask the real error.
  }
}
