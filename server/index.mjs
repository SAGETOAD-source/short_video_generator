import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRendersDir, renderClipToMp4 } from './render.mjs';
import { analyzeYoutubeVideo } from './analyze.mjs';
import fs from 'node:fs';
import { google } from 'googleapis';
import { commandExists } from './ytdlp.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

await ensureRendersDir();

app.get('/api/health', async (_req, res) => {
  const hasYtDlp = await commandExists('yt-dlp');
  res.json({
    ok: true,
    service: 'shortscraft-renderer',
    port: PORT,
    ytdlp: hasYtDlp,
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { videoUrl, videoId } = req.body || {};
    if (!videoUrl || !videoId) {
      return res.status(400).json({ error: 'videoUrl and videoId are required.' });
    }

    const analysis = await analyzeYoutubeVideo(videoUrl, videoId);
    return res.json(analysis);
  } catch (error) {
    console.error('[analyze] failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
});

app.post('/api/render', async (req, res) => {
  try {
    const { videoId, videoUrl, clip, music, musicVolume } = req.body || {};

    if (!videoId || !clip?.id) {
      return res.status(400).json({ error: 'videoId and clip.id are required.' });
    }

    const result = await renderClipToMp4({ videoId, videoUrl, clip, music, musicVolume });
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    return res.json({
      message: `Rendered ${clip.id} (${result.mode})`,
      mode: result.mode,
      renderedVideoUrl: `${baseUrl}/api/renders/${result.filename}`,
      filename: result.filename,
    });
  } catch (error) {
    console.error('[render] failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Render failed',
    });
  }
});

app.get('/api/renders/:filename', async (req, res) => {
  const safeName = path.basename(req.params.filename);
  if (!safeName.endsWith('.mp4')) {
    return res.status(400).json({ error: 'Only MP4 files are served from /api/renders.' });
  }

  const filePath = path.join(__dirname, 'renders', safeName);
  return res.download(filePath, safeName, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ error: 'Rendered file not found.' });
    }
  });
});

app.post('/api/publish/:platform', async (req, res) => {
  const platform = req.params.platform;
  if (platform !== 'youtube' && platform !== 'instagram') {
    return res.status(400).json({ error: 'Platform must be youtube or instagram.' });
  }

  const { title, clip, renderedVideoUrl } = req.body || {};
  if (!clip?.id) {
    return res.status(400).json({ error: 'clip is required for publish.' });
  }

  const label = platform === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels';
  const studioUrl = platform === 'youtube'
    ? 'https://studio.youtube.com/channel/upload'
    : 'https://www.instagram.com/';

  if (platform === 'youtube' && process.env.YOUTUBE_CLIENT_ID) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        'http://localhost:8001/oauth2callback'
      );
      
      oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      
      let filePath = '';
      if (renderedVideoUrl && renderedVideoUrl.includes('/api/renders/')) {
        const parts = renderedVideoUrl.split('/');
        const name = parts[parts.length - 1];
        filePath = path.join(__dirname, 'renders', name);
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(400).json({ error: 'Rendered video file not found locally.' });
      }

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: title || clip.title,
            description: req.body.description || clip.caption,
            tags: req.body.tags || [],
          },
          status: {
            privacyStatus: 'private', // Upload as private initially
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(filePath),
        },
      });

      return res.json({
        message: `Successfully uploaded to YouTube as private! Video ID: ${response.data.id}`,
        platform,
        clipId: clip.id,
        renderedVideoUrl: renderedVideoUrl || null,
        studioUrl: `https://studio.youtube.com/video/${response.data.id}/edit`,
        postUrl: `https://youtu.be/${response.data.id}`,
      });
    } catch (err) {
      console.error('[youtube upload error]:', err);
      return res.status(500).json({ error: 'YouTube upload failed: ' + (err.message || 'Unknown error') });
    }
  }

  return res.json({
    message: `Mock publish queued for "${title || clip.title}" on ${label}. Connect real OAuth credentials to enable live uploads.`,
    platform,
    clipId: clip.id,
    renderedVideoUrl: renderedVideoUrl || null,
    studioUrl,
    postUrl: studioUrl,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`ShortsCraft renderer running at http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
