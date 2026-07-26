import { MusicTrack, VideoClip } from '../types';
import { formatTime } from './mockData';

export type PublishPlatform = 'youtube' | 'instagram';

export interface PublishPayload {
  platform: PublishPlatform;
  clip: VideoClip;
  title: string;
  description: string;
  tags: string[];
  music: MusicTrack | null;
  musicVolume: number;
  renderedVideoUrl?: string;
}

interface PublishResponse {
  message?: string;
  url?: string;
  studioUrl?: string;
  postUrl?: string;
}

export interface RenderResponse {
  message?: string;
  mode?: 'cached' | 'youtube' | 'thumbnail';
  renderedVideoUrl: string;
  filename?: string;
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return ''; // Use Vite proxy in development
  }
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

export function buildDescription(clip: VideoClip, selectedTags: string[], selectedMusic: MusicTrack | null, musicVolume: number) {
  return `${clip.caption}

${selectedTags.slice(0, 8).join(' ')}

Music: ${selectedMusic?.name || 'Background Music'} (${musicVolume}% volume)
Clip: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`;
}

export async function publishClip(payload: PublishPayload): Promise<PublishResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Publishing API is not configured. Add VITE_API_BASE_URL to .env and run a backend that accepts publish requests.');
  }

  const response = await fetch(`${apiBaseUrl}/api/publish/${payload.platform}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Publish failed with HTTP ${response.status}`);
  }

  return body;
}

export async function renderClip(payload: {
  videoId: string;
  videoUrl: string;
  clip: VideoClip;
  music?: MusicTrack | null;
  musicVolume?: number;
}): Promise<RenderResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Renderer API is not configured. Add VITE_API_BASE_URL to .env and run npm run server.');
  }

  const response = await fetch(`${apiBaseUrl}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Render failed with HTTP ${response.status}`);
  }

  if (!body?.renderedVideoUrl) {
    throw new Error('Renderer did not return a renderedVideoUrl.');
  }

  return body as RenderResponse;
}

export function downloadPublishPackage(payload: PublishPayload) {
  const safeTitle = payload.title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || payload.clip.id;

  const file = {
    platform: payload.platform,
    title: payload.title,
    caption: payload.clip.caption,
    description: payload.description,
    tags: payload.tags,
    clip: {
      id: payload.clip.id,
      startTime: payload.clip.startTime,
      endTime: payload.clip.endTime,
      duration: payload.clip.duration,
      renderedVideoUrl: payload.renderedVideoUrl || null,
    },
    music: payload.music ? {
      name: payload.music.name,
      genre: payload.music.genre,
      bpm: payload.music.bpm,
      volume: payload.musicVolume,
    } : null,
  };

  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeTitle}-${payload.platform}-publish-package.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function createPreviewFallbackVideo(clip: VideoClip) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context is unavailable.');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1f3a');
  gradient.addColorStop(1, '#0d0f1c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Inter, Arial, sans-serif';
  const title = clip.title.slice(0, 60);
  ctx.fillText(title, 48, 120);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '30px Inter, Arial, sans-serif';
  ctx.fillText(`Clip: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`, 48, 184);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '26px Inter, Arial, sans-serif';
  const caption = clip.caption.slice(0, 140);
  ctx.fillText(caption, 48, 250);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    recorder.onerror = () => reject(new Error('Failed to record fallback preview video.'));
  });

  recorder.start();
  await new Promise((resolve) => setTimeout(resolve, 1800));
  recorder.stop();
  return recording;
}

export async function downloadRenderedVideo(
  clip: VideoClip,
  renderedVideoUrl = clip.renderedVideoUrl,
): Promise<'rendered' | 'fallback' | 'failed'> {
  if (!renderedVideoUrl) {
    try {
      const fallback = await createPreviewFallbackVideo(clip);
      downloadBlob(fallback, `${clip.id}-preview.webm`);
      return 'fallback';
    } catch (_error) {
      return 'failed';
    }
  }

  try {
    // Instead of fetching the blob into memory (which can crash on large videos)
    // or relying on cross-origin fetch, we use the proxy (if in dev) and a native <a> tag download
    const anchor = document.createElement('a');
    anchor.href = renderedVideoUrl;
    // ensure the browser tries to download it instead of navigating
    anchor.download = `${clip.id}.mp4`; 
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return 'rendered';
  } catch (_error) {
    try {
      const fallback = await createPreviewFallbackVideo(clip);
      downloadBlob(fallback, `${clip.id}-preview.webm`);
      return 'fallback';
    } catch (_fallbackError) {
      return 'failed';
    }
  }
}
