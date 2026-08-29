/** Gallery Manager API — manual Drive sync plus editable public metadata. */

import { createClient } from '../../../utils/supabase/client.tsx';
import { projectId } from '../../../utils/supabase/info';

const supabase = createClient();
const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c`;

export type ManagedGalleryImage = {
  id: string;
  album_id: string;
  display_title: string | null;
  title: string | null;
  caption: string | null;
  alt_text: string | null;
  stage: 'before' | 'progress' | 'completed' | 'concept';
  display_position: number;
  position: number;
  published: boolean;
  is_active: boolean;
  url: string;
  thumbnail_url: string | null;
};

export type ManagedGalleryAlbum = {
  id: string;
  name: string;
  source_folder_name?: string | null;
  public_title: string | null;
  public_slug: string | null;
  description: string | null;
  project_type: string | null;
  services: string[];
  location_label: string | null;
  status: 'draft' | 'in_progress' | 'completed';
  cover_image_id: string | null;
  display_position: number;
  published: boolean;
  is_active: boolean;
  images: ManagedGalleryImage[];
};

async function galleryRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Gallery request failed');
  return body as T;
}

export async function fetchManagedGallery(): Promise<ManagedGalleryAlbum[]> {
  const result = await galleryRequest<{ albums: ManagedGalleryAlbum[] }>('/gallery/manage');
  return result.albums;
}

export async function saveGalleryAlbum(album: ManagedGalleryAlbum): Promise<ManagedGalleryAlbum> {
  const result = await galleryRequest<{ album: ManagedGalleryAlbum }>(`/gallery/albums/${album.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      public_title: album.public_title,
      public_slug: album.public_slug,
      description: album.description,
      project_type: album.project_type,
      services: album.services,
      location_label: album.location_label,
      status: album.status,
      cover_image_id: album.cover_image_id,
      display_position: album.display_position,
      published: album.published,
    }),
  });
  return result.album;
}

export async function saveGalleryImages(albumId: string, images: ManagedGalleryImage[]): Promise<void> {
  await galleryRequest(`/gallery/albums/${albumId}/images`, {
    method: 'PUT',
    body: JSON.stringify({ images }),
  });
}

export async function triggerGallerySyncWorkflow(): Promise<void> {
  await galleryRequest('/gallery/sync', { method: 'POST', body: '{}' });
}
