import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { projectId } from '../../../utils/supabase/info';
import { createClient, listClients } from '../clients/api';
import { createEstimate } from '../estimating/api';

const supabase = createClient();
export interface LeadActivity { id: string; activity_type: string; summary: string; occurred_at: string; actor_user_id: string | null; }
export interface LeadTask { id: string; title: string; task_type: string; assigned_to: string | null; due_at: string | null; completed_at: string | null; }
export interface LeadAppointment { id: string; appointment_type: string; status: string; starts_at: string; location: string | null; assigned_to: string | null; }
export interface AutomationStatus { attentionCount: number; failedCount: number; oldestCreatedAt: string | null; lastError: string | null; }
export interface RevenueAdSpend { platform: string; campaign_name: string | null; spend_cents: number; }
export interface RevenueOperationalMetrics { appointmentsMtd: number; estimatesMtd: number; adSpendCentsMtd: number; adSpend: RevenueAdSpend[]; }

async function automationRequest(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again.');
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/automations/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Automation request failed');
  return body;
}

export async function getAutomationStatus(): Promise<AutomationStatus> { return automationRequest('status'); }
export async function retryLeadAutomations() { return automationRequest('retry', { method: 'POST' }); }

export async function getRevenueOperationalMetrics(): Promise<RevenueOperationalMetrics> {
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const dateOnly = monthStart.toISOString().slice(0, 10);
  const [appointments, estimates, spend] = await Promise.all([
    supabase.from('lead_appointments').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('ad_spend_daily').select('platform,campaign_name,spend_cents').gte('spend_date', dateOnly),
  ]);
  failIf(appointments.error, 'Failed to load appointment KPI');
  failIf(estimates.error, 'Failed to load estimate KPI');
  failIf(spend.error, 'Failed to load acquisition KPI');
  return {
    appointmentsMtd: appointments.count || 0,
    estimatesMtd: estimates.count || 0,
    adSpendCentsMtd: (spend.data || []).reduce((sum, row: any) => sum + Number(row.spend_cents || 0), 0),
    adSpend: (spend.data || []) as RevenueAdSpend[],
  };
}

export async function openOrCreateEstimateFromLead(lead: any, createdBy?: string): Promise<string> {
  const existing = await supabase.from('estimates').select('id').eq('lead_id', String(lead.id)).order('created_at', { ascending: false }).limit(1).maybeSingle();
  failIf(existing.error, 'Failed to check lead estimate');
  if (existing.data?.id) return String(existing.data.id);
  if (!lead.email?.trim()) throw new Error('Add the customer email before creating an estimate.');

  const clients = await listClients();
  let client = clients.find((item: any) => item.email?.toLowerCase() === lead.email.trim().toLowerCase());
  if (!client) client = await createClient({ name: lead.name || 'Website lead', email: lead.email.trim(), phone: lead.phone || undefined, source: lead.source || 'CRM lead', notes: lead.project_details || lead.message || lead.notes || undefined });
  const estimate = await createEstimate({ client_id: String(client.id), lead_id: String(lead.id), name: lead.service_type || lead.project_type || `${lead.name} project`, site_address: lead.project_address || lead.address || undefined, created_by: createdBy });
  return estimate.id;
}

export async function listLeadOperations(leadId: string) {
  const [activityResult, taskResult, appointmentResult] = await Promise.all([
    supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('lead_tasks').select('*').eq('lead_id', leadId).order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('lead_appointments').select('*').eq('lead_id', leadId).order('starts_at', { ascending: true }),
  ]);
  failIf(activityResult.error, 'Failed to load lead activity'); failIf(taskResult.error, 'Failed to load lead tasks'); failIf(appointmentResult.error, 'Failed to load appointments');
  return { activities: (activityResult.data || []) as LeadActivity[], tasks: (taskResult.data || []) as LeadTask[], appointments: (appointmentResult.data || []) as LeadAppointment[] };
}
export async function addLeadActivity(leadId: string, summary: string, actorUserId?: string) { const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: 'note', summary, actor_user_id: actorUserId || null }); failIf(error, 'Failed to add activity'); }
export async function addLeadTask(input: { leadId: string; title: string; dueAt?: string; assignedTo?: string; createdBy?: string }) { const { error } = await supabase.from('lead_tasks').insert({ lead_id: input.leadId, title: input.title, due_at: input.dueAt || null, assigned_to: input.assignedTo || null, created_by: input.createdBy || null }); failIf(error, 'Failed to add next action'); }
export async function setLeadTaskCompleted(id: string, completed: boolean) { const { error } = await supabase.from('lead_tasks').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', id); failIf(error, 'Failed to update next action'); }
export async function addLeadAppointment(input: { leadId: string; type: string; startsAt: string; location?: string; assignedTo?: string; createdBy?: string }) { const { error } = await supabase.from('lead_appointments').insert({ lead_id: input.leadId, appointment_type: input.type, starts_at: input.startsAt, location: input.location || null, assigned_to: input.assignedTo || null, created_by: input.createdBy || null }); failIf(error, 'Failed to schedule appointment'); }
