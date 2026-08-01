import { apiCall } from '../../../utils/supabase/client';

export type EvidenceStage = 'before' | 'progress' | 'after' | 'general';
export type MediaKind = 'photo' | 'video' | 'audio' | 'document';

export interface TaskMedia {
  id: string;
  project_id: string;
  task_id: string | null;
  task_update_id: string | null;
  original_filename: string;
  content_type: string;
  byte_size: number;
  media_kind: MediaKind;
  evidence_stage: EvidenceStage;
  caption: string | null;
  captured_at: string | null;
  uploaded_by: string;
  client_visible: boolean;
  social_approved: boolean;
  created_at: string;
  url: string;
}

const CLIENT_FILE_LIMITS = {
  photo: 12 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

function kindForFile(file: File): MediaKind {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

function webpName(name: string) {
  return `${name.replace(/\.[^/.]+$/, '') || 'photo'}.webp`;
}

/**
 * Jobsite photo optimization: remove oversized phone-camera dimensions and
 * metadata while preserving enough resolution for QC, before/after evidence,
 * and later social use. Falls back safely for formats a browser cannot decode.
 */
export async function optimizeMediaFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  let image: ImageBitmap | null = null;
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.78));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], webpName(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    image?.close();
  }
}

export function assertMediaFileSize(file: File) {
  const kind = kindForFile(file);
  const limit = CLIENT_FILE_LIMITS[kind];
  if (file.size > limit) {
    const mb = Math.round(limit / 1024 / 1024);
    throw new Error(`${kind[0].toUpperCase()}${kind.slice(1)} files must be ${mb} MB or smaller`);
  }
}

export async function listTaskMedia(projectId: string, taskId: string) {
  const params = new URLSearchParams({ projectId, taskId });
  const result = await apiCall(`/media?${params}`, { requiresAuth: true });
  return (result.media ?? []) as TaskMedia[];
}

export async function uploadTaskMedia(
  projectId: string,
  taskId: string,
  file: File,
  evidenceStage: EvidenceStage,
  caption?: string,
) {
  assertMediaFileSize(file);
  const prepared = await apiCall('/media/upload-url', {
    method: 'POST',
    requiresAuth: true,
    body: {
      projectId,
      taskId,
      fileName: file.name,
      contentType: file.type,
      byteSize: file.size,
      evidenceStage,
      caption: caption?.trim() || null,
      capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    },
  });

  const response = await fetch(prepared.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!response.ok) throw new Error(`R2 upload failed (${response.status})`);

  const completed = await apiCall(`/media/${prepared.media.id}/complete`, {
    method: 'POST',
    requiresAuth: true,
  });
  return completed.media as TaskMedia;
}

export async function updateMediaApproval(
  id: string,
  clientVisible: boolean,
  socialApproved: boolean,
) {
  const result = await apiCall(`/media/${id}/approval`, {
    method: 'PATCH',
    requiresAuth: true,
    body: { clientVisible, socialApproved },
  });
  return result.media as TaskMedia;
}

export async function deleteTaskMedia(id: string) {
  await apiCall(`/media/${id}`, { method: 'DELETE', requiresAuth: true });
}
