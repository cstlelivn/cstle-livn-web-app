import { createClient as createSupabaseClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { projectId } from '../../../utils/supabase/info';
import { createClient as createClientRecord, listClients } from '../clients/api';
import { createEstimate } from '../estimating/api';

const supabase = createSupabaseClient();
export interface LeadActivity { id: string; activity_type: string; summary: string; occurred_at: string; actor_user_id: string | null; }
export interface LeadTask { id: string; title: string; task_type: string; assigned_to: string | null; due_at: string | null; completed_at: string | null; }
export interface LeadAppointment { id: string; appointment_type: string; status: string; starts_at: string; location: string | null; assigned_to: string | null; }
export interface LeadCommunicationPreference { lead_id: string; email_contact_basis: string; email_basis_expires_at: string | null; email_opted_out_at: string | null; sms_contact_basis: string; sms_basis_expires_at: string | null; sms_opted_out_at: string | null; }
export interface LeadMessage { id: string; channel: 'email' | 'sms'; purpose: string; template_key: string; status: string; created_at: string; sent_at: string | null; error_message: string | null; }
export interface AutomationStatus { attentionCount: number; failedCount: number; oldestCreatedAt: string | null; lastError: string | null; }
export interface RevenueAdSpend { platform: string; campaign_name: string | null; spend_cents: number; }
export interface RevenueOperationalMetrics { appointmentsMtd: number; estimatesMtd: number; adSpendCentsMtd: number; adSpend: RevenueAdSpend[]; }
export interface SalesWorkItem { leadId: string; priority: 'Urgent' | 'Today' | 'Next'; score: number; reason: string; detail: string; }
export interface LeadRelatedRecords { estimateId: string | null; estimateName: string | null; estimateStatus: string | null; clientId: string | null; projectId: string | null; }

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
export async function getLeadAutomationStatus(leadId: string): Promise<AutomationStatus> { return automationRequest(`status/${encodeURIComponent(leadId)}`); }
export async function retryLeadAutomation(leadId: string) { return automationRequest(`retry/${encodeURIComponent(leadId)}`, { method: 'POST' }); }

export async function getSalesWorkQueue(leads: any[]): Promise<SalesWorkItem[]> {
  const openLeads = leads.filter((lead) => !['Won', 'Lost'].includes(lead.status));
  if (!openLeads.length) return [];
  const ids = openLeads.map((lead) => String(lead.id));
  const [tasksResult, appointmentsResult, estimatesResult, automationContext] = await Promise.all([
    supabase.from('lead_tasks').select('lead_id,title,due_at,completed_at').in('lead_id', ids).is('completed_at', null).limit(250),
    supabase.from('lead_appointments').select('lead_id,appointment_type,starts_at,status').in('lead_id', ids).gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(100),
    supabase.from('estimates').select('lead_id,created_at,status').in('lead_id', ids).not('lead_id', 'is', null).limit(100),
    automationRequest('work-queue'),
  ]);
  failIf(tasksResult.error, 'Failed to load sales tasks'); failIf(appointmentsResult.error, 'Failed to load sales appointments'); failIf(estimatesResult.error, 'Failed to load estimate follow-up');
  const tasks = tasksResult.data || []; const appointments = appointmentsResult.data || []; const estimates = estimatesResult.data || [];
  const attention = new Map((automationContext.events || []).map((event: any) => [String(event.leadId), event]));
  const now = Date.now(); const twoDays = now + 48 * 60 * 60 * 1000;
  return openLeads.map((lead): SalesWorkItem | null => {
    const leadId = String(lead.id); const leadTasks = tasks.filter((task: any) => String(task.lead_id) === leadId);
    const overdue = leadTasks.filter((task: any) => task.due_at && new Date(task.due_at).getTime() < now).sort((a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];
    const appointment = appointments.find((item: any) => String(item.lead_id) === leadId && new Date(item.starts_at).getTime() <= twoDays);
    const hasEstimate = estimates.some((item: any) => String(item.lead_id) === leadId);
    const automation = attention.get(leadId) as any;
    const hot = ['Hot', 'Warm'].includes(lead.qualification_band); const uncontacted = !lead.first_responded_at && lead.status === 'New';
    if (uncontacted) return { leadId, priority: 'Urgent', score: 130 + (hot ? 20 : 0), reason: hot ? `${lead.qualification_band} lead awaiting first contact` : 'New lead awaiting first contact', detail: 'Respond, assign an owner and set the next action.' };
    if (overdue) return { leadId, priority: 'Urgent', score: 120, reason: `Overdue: ${overdue.title}`, detail: 'Complete or reschedule this follow-up.' };
    if (automation) return { leadId, priority: 'Urgent', score: 110, reason: 'Follow-up delivery needs attention', detail: automation.lastError || 'Open the lead and retry its delivery.' };
    if (hot && !lead.owner_user_id) return { leadId, priority: 'Today', score: 95, reason: `${lead.qualification_band} opportunity has no owner`, detail: 'Assign accountability before the opportunity goes cold.' };
    if (appointment) return { leadId, priority: 'Today', score: 85, reason: `${appointment.appointment_type} coming up`, detail: new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Regina' }).format(new Date(appointment.starts_at)) };
    if (lead.status === 'Estimate' && !hasEstimate) return { leadId, priority: 'Today', score: 80, reason: 'Estimate stage without a linked estimate', detail: 'Create or link the estimate from this lead.' };
    if (!leadTasks.length) return { leadId, priority: 'Next', score: 60 + (hot ? 10 : 0), reason: 'No next action scheduled', detail: 'Add the specific next step and due time.' };
    return null;
  }).filter((item): item is SalesWorkItem => Boolean(item)).sort((a, b) => b.score - a.score).slice(0, 12);
}

export async function getLeadRelatedRecords(leadId: string): Promise<LeadRelatedRecords> {
  const { data, error } = await supabase.from('estimates').select('id,name,status,client_id,converted_project_id').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  failIf(error, 'Failed to load related records');
  return { estimateId: data?.id || null, estimateName: data?.name || null, estimateStatus: data?.status || null, clientId: data?.client_id || null, projectId: data?.converted_project_id || null };
}

export async function listClientRelatedEstimates(clientId: string) {
  const { data, error } = await supabase.from('estimates').select('id,name,status,site_address,converted_project_id,created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(50);
  failIf(error, 'Failed to load customer estimates');
  return data || [];
}

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
  if (!client) client = await createClientRecord({ name: lead.name || 'Website lead', email: lead.email.trim(), phone: lead.phone || undefined, source: lead.source || 'CRM lead', notes: lead.project_details || lead.message || lead.notes || undefined });
  const estimate = await createEstimate({ client_id: String(client.id), lead_id: String(lead.id), name: lead.service_type || lead.project_type || `${lead.name} project`, site_address: lead.project_address || lead.address || undefined, created_by: createdBy });
  return estimate.id;
}

export async function listLeadOperations(leadId: string) {
  const [activityResult, taskResult, appointmentResult, preferenceResult, messageResult] = await Promise.all([
    supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('lead_tasks').select('*').eq('lead_id', leadId).order('due_at', { ascending: true, nullsFirst: false }),
    supabase.from('lead_appointments').select('*').eq('lead_id', leadId).order('starts_at', { ascending: true }),
    supabase.from('lead_communication_preferences').select('*').eq('lead_id', leadId).maybeSingle(),
    supabase.from('lead_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(20),
  ]);
  failIf(activityResult.error, 'Failed to load lead activity'); failIf(taskResult.error, 'Failed to load lead tasks'); failIf(appointmentResult.error, 'Failed to load appointments'); failIf(preferenceResult.error, 'Failed to load communication preferences'); failIf(messageResult.error, 'Failed to load message history');
  return { activities: (activityResult.data || []) as LeadActivity[], tasks: (taskResult.data || []) as LeadTask[], appointments: (appointmentResult.data || []) as LeadAppointment[], communicationPreference: preferenceResult.data as LeadCommunicationPreference | null, messages: (messageResult.data || []) as LeadMessage[] };
}
export async function optOutLeadChannel(leadId: string, channel: 'email' | 'sms') { const field = channel === 'email' ? 'email_opted_out_at' : 'sms_opted_out_at'; const { error } = await supabase.from('lead_communication_preferences').upsert({ lead_id: leadId, [field]: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'lead_id' }); failIf(error, `Failed to stop ${channel}`); }
export async function addLeadActivity(leadId: string, summary: string, actorUserId?: string) { const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: 'note', summary, actor_user_id: actorUserId || null }); failIf(error, 'Failed to add activity'); }
export async function addLeadTask(input: { leadId: string; title: string; dueAt?: string; assignedTo?: string; createdBy?: string }) { const { error } = await supabase.from('lead_tasks').insert({ lead_id: input.leadId, title: input.title, due_at: input.dueAt || null, assigned_to: input.assignedTo || null, created_by: input.createdBy || null }); failIf(error, 'Failed to add next action'); }
export async function setLeadTaskCompleted(id: string, completed: boolean) { const { error } = await supabase.from('lead_tasks').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', id); failIf(error, 'Failed to update next action'); }
export async function addLeadAppointment(input: { leadId: string; type: string; startsAt: string; location?: string; assignedTo?: string; createdBy?: string }) { const { error } = await supabase.from('lead_appointments').insert({ lead_id: input.leadId, appointment_type: input.type, starts_at: input.startsAt, location: input.location || null, assigned_to: input.assignedTo || null, created_by: input.createdBy || null }); failIf(error, 'Failed to schedule appointment'); }
