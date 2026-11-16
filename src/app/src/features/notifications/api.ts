import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { withJWTRefresh } from '../../lib/jwt-refresh';

const supabase = createClient();
const PREFERENCE_ID = '00000000-0000-0000-0000-000000000081';

export interface WeeklyProjectDigestPreference {
  weeklyProjectDigestEnabled: boolean;
  recipientEmail: string;
  lastDigestSentAt: string | null;
}

export async function getWeeklyProjectDigestPreference(): Promise<WeeklyProjectDigestPreference> {
  const { data, error } = await withJWTRefresh(
    () => supabase
      .from('company_notification_preferences')
      .select('weekly_project_digest_enabled,recipient_email,last_digest_sent_at')
      .eq('id', PREFERENCE_ID)
      .single(),
    'load weekly project digest preference'
  );
  failIf(error, 'Failed to load weekly project digest preference');
  return {
    weeklyProjectDigestEnabled: Boolean(data.weekly_project_digest_enabled),
    recipientEmail: data.recipient_email || 'info@cstlelivn.ca',
    lastDigestSentAt: data.last_digest_sent_at || null,
  };
}

export async function setWeeklyProjectDigestEnabled(enabled: boolean): Promise<WeeklyProjectDigestPreference> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await withJWTRefresh(
    () => supabase
      .from('company_notification_preferences')
      .update({
        weekly_project_digest_enabled: enabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', PREFERENCE_ID)
      .select('weekly_project_digest_enabled,recipient_email,last_digest_sent_at')
      .single(),
    'update weekly project digest preference'
  );
  failIf(error, 'Failed to update weekly project digest preference');
  return {
    weeklyProjectDigestEnabled: Boolean(data.weekly_project_digest_enabled),
    recipientEmail: data.recipient_email || 'info@cstlelivn.ca',
    lastDigestSentAt: data.last_digest_sent_at || null,
  };
}
