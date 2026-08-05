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

    // Aim for a sub-megabyte upload while retaining a 1920px long edge. A
    // lower-quality pass is only attempted when the previous result is still
    // over target; this avoids needlessly degrading already-efficient photos.
    const targetBytes = 850 * 1024;
    let best: Blob | null = null;
    for (const quality of [0.76, 0.66, 0.56, 0.46]) {
      const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (!candidate) continue;
      if (!best || candidate.size < best.size) best = candidate;
      if (candidate.size <= targetBytes) break;
    }
    if (!best || best.size >= file.size) return file;
    return new File([best], webpName(file.name), {
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

export async function listProjectMedia(projectId: string, taskIds: string[]) {
  // This is deliberately user-triggered (the Files & Activity tab), never a
  // poll. Reuse the already-live authenticated routes so project history is
  // available even when an Edge Function deployment is temporarily blocked.
  const scopes = [null, ...taskIds];
  const batches: TaskMedia[][] = [];
  for (let index = 0; index < scopes.length; index += 4) {
    const rows = await Promise.all(scopes.slice(index, index + 4).map(async (taskId) => {
      const params = new URLSearchParams({ projectId });
      if (taskId) params.set('taskId', taskId);
      const result = await apiCall(`/media?${params}`, { requiresAuth: true });
      return (result.media ?? []) as TaskMedia[];
    }));
    batches.push(...rows);
  }
  return batches.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function uploadTaskMedia(
  projectId: string,
  taskId: string,
  file: File,
  evidenceStage: EvidenceStage,
  caption?: string,
  taskUpdateId?: string,
) {
  assertMediaFileSize(file);
  const prepared = await apiCall('/media/upload-url', {
    method: 'POST',
    requiresAuth: true,
    body: {
      projectId,
      taskId,
      taskUpdateId: taskUpdateId || null,
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Produce a universally compatible social-media download without storing a
 * second R2 object. Photos become high-quality JPEG; other media keeps its
 * original format. The signed R2 URL is fetched only on this explicit click.
 */
export async function downloadMediaForSocial(item: TaskMedia) {
  const response = await fetch(item.url);
  if (!response.ok) throw new Error(`Could not download file (${response.status})`);
  const source = await response.blob();
  if (item.media_kind !== 'photo') {
    downloadBlob(source, item.original_filename);
    return;
  }

  let image: ImageBitmap | null = null;
  try {
    image = await createImageBitmap(source, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('This browser could not prepare the JPEG');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!jpeg) throw new Error('This browser could not prepare the JPEG');
    const baseName = item.original_filename.replace(/\.[^/.]+$/, '') || 'social-photo';
    downloadBlob(jpeg, `${baseName}-social.jpg`);
  } finally {
    image?.close();
  }
}
