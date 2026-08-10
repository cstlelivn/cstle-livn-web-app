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

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  // iOS sometimes hands back an empty/octet-stream MIME type for HEIC files
  // picked from the photo library rather than captured live -- the file
  // extension is the only reliable signal in that case.
  return !type && /\.hei[cf]$/i.test(file.name);
}

// Hard ceiling on what we'll ever let through un-shrunk. WebP compression at
// the qualities below always gets a real photo far under this, so hitting it
// means compression genuinely failed (corrupt file, unsupported color
// profile, etc.) -- in that case we fail loudly instead of silently letting
// an uncompressed multi-megabyte original reach R2. This is what let a ~3MB
// photo into storage before this fix: the old code fell back to uploading
// the original file whenever `createImageBitmap` couldn't decode it (which
// happens for HEIC -- the default iPhone photo format -- in Chrome/Android
// and sometimes Safari), with no size check on that fallback at all.
const OPTIMIZE_HARD_CAP = { normal: 2 * 1024 * 1024, marketing: 4 * 1024 * 1024 };

/**
 * Jobsite photo optimization: remove oversized phone-camera dimensions and
 * metadata while preserving enough resolution for QC, before/after evidence,
 * and later social use. HEIC/HEIF sources (the default iPhone photo format)
 * are converted to JPEG first since browsers generally can't decode HEIC
 * directly. If compression genuinely can't bring a large file down, this
 * throws rather than silently uploading an oversized original.
 */
export async function optimizeMediaFile(file: File, marketing = false): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }
  if (!file.type.startsWith('image/') && !isHeic(file)) {
    return file;
  }

  const hardCap = marketing ? OPTIMIZE_HARD_CAP.marketing : OPTIMIZE_HARD_CAP.normal;
  const failIfTooLarge = (): never => {
    throw new Error("Couldn't compress this photo. Try again, or use a different photo.");
  };

  let source: File | Blob = file;
  if (isHeic(file)) {
    try {
      const heic2any = (await import('heic2any')).default;
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      return file.size > hardCap ? failIfTooLarge() : file;
    }
  }

  let image: ImageBitmap | null = null;
  try {
    image = await createImageBitmap(source, { imageOrientation: 'from-image' });
    const maxEdge = marketing ? 2400 : 1920;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return file.size > hardCap ? failIfTooLarge() : file;
    context.drawImage(image, 0, 0, width, height);

    // Aim for a sub-megabyte upload while retaining a 1920px long edge. A
    // lower-quality pass is only attempted when the previous result is still
    // over target; this avoids needlessly degrading already-efficient photos.
    const targetBytes = (marketing ? 1200 : 350) * 1024;
    let best: Blob | null = null;
    for (const quality of marketing ? [0.82, 0.78, 0.75] : [0.74, 0.70, 0.67, 0.65]) {
      const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (!candidate) continue;
      if (!best || candidate.size < best.size) best = candidate;
      if (candidate.size <= targetBytes) break;
    }
    if (!best || best.size >= file.size) {
      return file.size > hardCap ? failIfTooLarge() : file;
    }
    return new File([best], webpName(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Couldn't compress")) throw error;
    return file.size > hardCap ? failIfTooLarge() : file;
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
