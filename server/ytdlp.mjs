import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export async function commandExists(command) {
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

export async function runYtDlp(args, options = {}) {
  const { maxBuffer = 25 * 1024 * 1024, timeout = 120000 } = options;
  const { stdout, stderr } = await execFileAsync('yt-dlp', args, { maxBuffer, timeout });
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}

export async function getVideoInfo(videoUrl) {
  const { stdout } = await runYtDlp(['-j', '--no-playlist', '--skip-download', videoUrl], {
    timeout: 90000,
  });
  return JSON.parse(stdout);
}

export async function downloadSubtitles(videoUrl, workDir, videoId) {
  await fs.mkdir(workDir, { recursive: true });
  const outputTemplate = path.join(workDir, `${videoId}`);

  try {
    await runYtDlp([
      '--skip-download',
      '--write-sub',
      '--write-auto-sub',
      '--sub-lang', 'en.*,en',
      '--convert-subs', 'vtt',
      '-o', outputTemplate,
      videoUrl,
    ], { timeout: 90000 });
  } catch (error) {
    console.warn('[ytdlp] subtitle download failed:', error.message);
  }

  const files = await fs.readdir(workDir);
  const vttFile = files.find((name) => name.startsWith(videoId) && name.endsWith('.vtt'));
  if (!vttFile) return null;

  const content = await fs.readFile(path.join(workDir, vttFile), 'utf8');
  return content;
}
