/**
 * Gallery API — sync website galleries from Google Drive
 */

import { supabase } from '../../../lib/supabase';

export async function triggerGallerySyncWorkflow(): Promise<void> {
  // Get access token from Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-bcab437c/gallery/sync`,
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
