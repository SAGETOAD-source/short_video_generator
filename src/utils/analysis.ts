import { VideoAnalysis } from '../types';
import { MUSIC_TRACKS } from './mockData';
import { getApiBaseUrl } from './publishing';

export async function analyzeVideo(videoUrl: string, videoId: string): Promise<VideoAnalysis> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('Analysis API is not configured. Add VITE_API_BASE_URL to .env and run npm run server.');
  }

  const response = await fetch(`${apiBaseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, videoId }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Analysis failed with HTTP ${response.status}`);
  }

  return {
    ...body,
    suggestedMusic: body.suggestedMusic?.length ? body.suggestedMusic : MUSIC_TRACKS.slice(0, 4),
  } as VideoAnalysis;
}
