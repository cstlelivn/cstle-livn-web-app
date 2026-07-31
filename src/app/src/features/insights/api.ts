import { createClient } from '../../../utils/supabase/client.tsx';

const supabase = createClient();

async function edgeFunctionUrl(path: string) {
  const { projectId } = await import('../../../utils/supabase/info.tsx');
  return `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c${path}`;
}

export interface InsightResult {
  content: string;
  scopeTier: 'individual_detail' | 'aggregate_only';
  id?: string;
  createdAt?: string;
}

// Server-side AI insights: the model call happens on the server with a
// server-only secret, and how much detail gets included is decided there
// based on the caller's real, verified role -- not by the browser. This
// replaces the old client-side "paste your OpenAI key in Settings, call
// OpenAI directly from the browser" flow, which couldn't be role-gated at
// all since the browser already had whatever data it assembled.
export async function generateInsights(periodDays = 90): Promise<InsightResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You need to be signed in to generate AI insights.');
  }

  const url = await edgeFunctionUrl('/insights/generate');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ periodDays }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `AI insights request failed (${res.status})`);
  }
  return json;
}

export async function listInsightHistory(): Promise<InsightResult[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return [];

  const url = await edgeFunctionUrl('/insights/history');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return (json.reports || []).map((r: any) => ({
    content: r.content,
    scopeTier: r.scope_tier,
    id: r.id,
    createdAt: r.created_at,
  }));
}
