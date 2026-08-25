import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface ReminderInput {
  lead_id?: string | null;
  client_id?: string | null;
  lead_name?: string | null;
  client_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  type: 'call' | 'email' | 'visit' | 'follow-up';
  due_date: string;
  due_time?: string | null;
  notes?: string | null;
}

const REMINDER_COLUMNS = [
  'id', 'lead_id', 'client_id', 'lead_name', 'client_name', 'contact_email',
  'contact_phone', 'type', 'due_date', 'due_time', 'notes',
  'completed', 'completed_at', 'created_by', 'created_at', 'updated_at',
].join(',');

export async function listReminders() {
  const { data, error } = await supabase
    .from('crm_reminders')
    .select(REMINDER_COLUMNS)
    .order('due_date', { ascending: true })
    .limit(500);
  failIf(error, 'Failed to list reminders');
  return data ?? [];
}

export async function createReminder(input: ReminderInput) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('crm_reminders')
    .insert({
      ...input,
      created_by: userData?.user?.id ?? null,
      created_at: now(),
      updated_at: now(),
    })
    .select(REMINDER_COLUMNS)
    .single();
  failIf(error, 'Failed to create reminder');
  return data;
}

export async function completeReminder(id: string) {
  const { data, error } = await supabase
    .from('crm_reminders')
    .update({ completed: true, completed_at: now(), updated_at: now() })
    .eq('id', id)
    .select(REMINDER_COLUMNS)
    .single();
  failIf(error, 'Failed to complete reminder');
  return data;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from('crm_reminders').delete().eq('id', id);
  failIf(error, 'Failed to delete reminder');
}
