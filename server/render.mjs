import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERS_DIR = path.join(__dirname, 'renders');
const FFMPEG = ffmpegInstaller.path;

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

async function commandExists(command) {
  try {
    if (process.platform === 'win32') {
      await execFileAsync('where', [command]);
    } else {
      await execFileAsync('which', [command]);
    }
    return true;
  } catch {
    return false;
  }
}

function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
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
  return lines.slice(0, 4);
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
  return `drawtext=${fontPart}text='${escapeDrawtext(text)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.5:boxborderw=12`;
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

async function renderFromThumbnail({ clip, outputPath, workDir }) {
  const thumbPath = path.join(workDir, `${clip.id}-thumb.jpg`);
  await downloadThumbnail(clip.thumbnail, thumbPath);

  const titleLines = wrapText(clip.title, 36);
  const captionLines = wrapText(clip.caption, 40);
  const duration = Math.min(Math.max(clip.duration, 3), 180);

  const filters = [
    'scale=1080:1920:force_original_aspect_ratio=increase',
    'crop=1080:1920',
    'format=yuv420p',
  ];

  titleLines.forEach((line, index) => {
    filters.push(drawTextFilter(line, { size: 52, y: 120 + index * 58, weight: 'bold' }));
  });

  captionLines.forEach((line, index) => {
    filters.push(drawTextFilter(line, { size: 38, y: 1600 + index * 46 }));
  });

  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', thumbPath,
    '-t', String(duration),
    '-vf', filters.join(','),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ]);
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

async function renderFromYoutube({ videoUrl, clip, outputPath, workDir }) {
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
  ], { maxBuffer: 20 * 1024 * 1024 });

  const files = await fs.readdir(workDir);
  const downloaded = files.find((name) => name.startsWith(`${clip.id}-raw.`));
  if (!downloaded) {
    throw new Error('yt-dlp did not produce a source file');
  }

  const sourcePath = path.join(workDir, downloaded);
  const caption = clip.caption.slice(0, 90);

  await runFfmpeg([
    '-y',
    '-i', sourcePath,
    '-vf', [
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      drawTextFilter(caption, { size: 42, y: 1740, weight: 'bold' }),
      'format=yuv420p',
    ].join(','),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputPath,
  ]);
}

export async function renderClipToMp4({ videoId, videoUrl, clip }) {
  await ensureRendersDir();

  const filename = `${sanitizeFilename(videoId)}-${sanitizeFilename(clip.id)}.mp4`;
  const outputPath = path.join(RENDERS_DIR, filename);

  if (await fileExists(outputPath)) {
    return { filename, outputPath, mode: 'cached' };
  }

  const workDir = path.join(RENDERS_DIR, 'tmp', `${videoId}-${clip.id}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    const useYoutubeSource = process.env.RENDER_YOUTUBE === 'true' && videoUrl;

    if (useYoutubeSource) {
      try {
        await runWithTimeout(
          renderFromYoutube({ videoUrl, clip, outputPath, workDir }),
          45000,
          'YouTube segment render',
        );
        return { filename, outputPath, mode: 'youtube' };
      } catch (error) {
        console.warn(`[render] YouTube segment render failed for ${clip.id}:`, error.message);
      }
    }

    await renderFromThumbnail({ clip, outputPath, workDir });
    return { filename, outputPath, mode: 'thumbnail' };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
