import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { commandExists } from './ytdlp.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERS_DIR = path.join(__dirname, 'renders');
const FFMPEG = ffmpegInstaller.path;

const VERTICAL_FILTER = [
  '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,boxblur=20:20[bg]',
  '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg]',
  '[bg][fg]overlay=(W-w)/2:(H-h)/2[vout]'
].join(';');

export async function ensureRendersDir() {
  await fs.mkdir(RENDERS_DIR, { recursive: true });
}

function sanitizeFilename(value) {
  return value.replace(/[^\w.-]/g, '_');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

function wrapText(text, maxChars = 42) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function fontArg(weight = 'regular') {
  if (process.platform === 'win32') {
    const file = weight === 'bold' ? 'arialbd.ttf' : 'arial.ttf';
    return `fontfile='C\\:/Windows/Fonts/${file}'`;
  }
  return '';
}

function drawTextFilter(text, { size, y, weight = 'regular' }) {
  const font = fontArg(weight);
  const fontPart = font ? `${font}:` : '';
  return `drawtext=${fontPart}text='${escapeDrawtext(text)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.55:boxborderw=14`;
}

function clipAudioMix({ musicVolume = 18 }) {
  const clampedMusic = Math.max(0, Math.min(60, Number(musicVolume)));
  const sourceVolume = Math.max(0.45, 1 - clampedMusic / 110);
  const bedVolume = Math.max(0.02, clampedMusic / 120);
  return { sourceVolume, bedVolume };
}

function musicFrequencyFromTrack(music) {
  if (!music) return 220;
  const bpmPart = music.bpm ? Math.max(60, Math.min(180, music.bpm)) : 120;
  const genreSeed = (music.genre || music.name || 'music')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const base = 120 + (genreSeed % 180);
  return Math.round((base + bpmPart) / 2);
}

function subtitleTimeline(caption, duration) {
  const words = caption.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunkSize = words.length > 16 ? 3 : 2;
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  const effectiveDuration = Math.max(1.5, duration);
  const step = effectiveDuration / chunks.length;
  return chunks.map((chunk, index) => {
    const start = Number((index * step).toFixed(2));
    const end = Number(Math.min(effectiveDuration, (index + 1) * step + 0.12).toFixed(2));
    return { chunk, start, end };
  });
}

function subtitleFilters(caption, duration) {
  const timeline = subtitleTimeline(caption, duration);
  return timeline.map(({ chunk, start, end }) => {
    const font = fontArg('bold');
    const fontPart = font ? `${font}:` : '';
    return `drawtext=${fontPart}text='${escapeDrawtext(chunk)}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=1620:box=1:boxcolor=black@0.62:boxborderw=16:enable='between(t,${start},${end})'`;
  });
}

async function downloadThumbnail(thumbnailUrl, destPath) {
  const response = await fetch(thumbnailUrl);
  if (!response.ok) {
    throw new Error(`Thumbnail download failed (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function runWithTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function captionFilters(caption) {
  const lines = wrapText(caption, 34);
  return lines.map((line, index) => drawTextFilter(line, {
    size: 40,
    y: 1560 + index * 48,
    weight: 'bold',
  }));
}

async function renderFromThumbnail({ clip, outputPath, workDir, music, musicVolume }) {
  const thumbPath = path.join(workDir, `${clip.id}-thumb.jpg`);
  await downloadThumbnail(clip.thumbnail, thumbPath);

  const titleLines = wrapText(clip.title, 36);
  const duration = Math.min(Math.max(clip.duration, 3), 180);
  const { bedVolume } = clipAudioMix({ musicVolume });
  const musicFrequency = musicFrequencyFromTrack(music);

  const videoFilters = [
    VERTICAL_FILTER,
    '[vout]format=yuv420p[vout2]',
    ...titleLines.map((line, index) => drawTextFilter(line, { size: 52, y: 120 + index * 58, weight: 'bold' })),
    ...subtitleFilters(clip.caption, duration),
  ];

  // We need to chain the drawtext filters after [vout2]
  let chainedDrawtext = videoFilters.slice(2).length > 0 
    ? `[vout2]${videoFilters.slice(2).join(',')}[vout3]`
    : `[vout2]copy[vout3]`;

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', thumbPath,
    '-f', 'lavfi',
    '-t', String(duration),
    '-i', `sine=frequency=${musicFrequency}:sample_rate=44100`,
    '-t', String(duration),
    '-filter_complex',
    `${videoFilters[0]};${videoFilters[1]};${chainedDrawtext};[1:a]volume=${bedVolume},afade=t=in:st=0:d=0.4,afade=t=out:st=${Math.max(0.5, duration - 0.7)}:d=0.6[aout]`,
    '-map', '[vout3]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ]);
}

async function renderFromYoutube({ videoUrl, clip, outputPath, workDir, music, musicVolume }) {
  const hasYtDlp = await commandExists('yt-dlp');
  if (!hasYtDlp) {
    throw new Error('yt-dlp not installed');
  }

  const rawPath = path.join(workDir, `${clip.id}-raw.%(ext)s`);
  const section = `*${clip.startTime}-${clip.endTime}`;

  await execFileAsync('yt-dlp', [
    '--no-playlist',
    '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '--download-sections', section,
    '-o', rawPath,
    videoUrl,
  ], { maxBuffer: 30 * 1024 * 1024, timeout: 180000 });

  const files = await fs.readdir(workDir);
  const downloaded = files.find((name) => name.startsWith(`${clip.id}-raw.`));
  if (!downloaded) {
    throw new Error('yt-dlp did not produce a source file');
  }

  const sourcePath = path.join(workDir, downloaded);
  const duration = Math.min(Math.max(clip.duration, 3), 180);
  const { sourceVolume, bedVolume } = clipAudioMix({ musicVolume });
  const musicFrequency = musicFrequencyFromTrack(music);
  const filters = [
    VERTICAL_FILTER,
    '[vout]format=yuv420p[vout2]',
    ...subtitleFilters(clip.caption, duration),
  ];

  let chainedDrawtext = filters.slice(2).length > 0 
    ? `[vout2]${filters.slice(2).join(',')}[vout3]`
    : `[vout2]copy[vout3]`;

  await runFfmpeg([
    '-y',
    '-i', sourcePath,
    '-f', 'lavfi',
    '-t', String(duration),
    '-i', `sine=frequency=${musicFrequency}:sample_rate=44100`,
    '-filter_complex',
    `${filters[0]};${filters[1]};${chainedDrawtext};[0:a]volume=${sourceVolume}[srca];[1:a]volume=${bedVolume},afade=t=in:st=0:d=0.4,afade=t=out:st=${Math.max(0.5, duration - 0.7)}:d=0.6[beda];[srca][beda]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
    '-map', '[vout3]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  ]);
}

function renderVariantSuffix({ music, musicVolume }) {
  const musicId = music?.id || 'nomusic';
  const volume = Number.isFinite(Number(musicVolume)) ? Number(musicVolume) : 18;
  return `${sanitizeFilename(musicId)}-v${Math.max(0, Math.min(100, Math.round(volume)))}`;
}

export async function renderClipToMp4({ videoId, videoUrl, clip, music = null, musicVolume = 18 }) {
  await ensureRendersDir();

  const variant = renderVariantSuffix({ music, musicVolume });
  const filename = `${sanitizeFilename(videoId)}-${sanitizeFilename(clip.id)}-${variant}.mp4`;
  const outputPath = path.join(RENDERS_DIR, filename);

  if (await fileExists(outputPath)) {
    return { filename, outputPath, mode: 'cached' };
  }

  const workDir = path.join(RENDERS_DIR, 'tmp', `${videoId}-${clip.id}`);
  await fs.mkdir(workDir, { recursive: true });

  const renderTimeout = Math.min(180000, Math.max(60000, clip.duration * 2500));

  try {
    if (videoUrl) {
      try {
        await runWithTimeout(
          renderFromYoutube({ videoUrl, clip, outputPath, workDir, music, musicVolume }),
          renderTimeout,
          'YouTube segment render',
        );
        return { filename, outputPath, mode: 'youtube' };
      } catch (error) {
        console.warn(`[render] YouTube segment render failed for ${clip.id}:`, error.message);
      }
    }

    await renderFromThumbnail({ clip, outputPath, workDir, music, musicVolume });
    return { filename, outputPath, mode: 'thumbnail' };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
