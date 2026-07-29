/**
 * Gallery API — sync website galleries from Google Drive
 */

import { createClient } from '../../../utils/supabase/client.tsx';
import { projectId } from '../../../utils/supabase/info';

const supabase = createClient();

export async function triggerGallerySyncWorkflow(): Promise<void> {
  // Get access token from Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/gallery/sync`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gallery sync failed: ${error}`);
  }

  const data = await response.json();
  return data;
}
