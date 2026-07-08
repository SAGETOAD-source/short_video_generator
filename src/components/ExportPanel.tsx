import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, Copy, Check, ExternalLink, Tag, Edit3, AlertCircle } from 'lucide-react';
import { VideoClip, MusicTrack } from '../types';
import { formatTime } from '../utils/mockData';
import {
  buildDescription,
  downloadPublishPackage,
  downloadRenderedVideo,
  getApiBaseUrl,
  publishClip,
  PublishPlatform,
  renderClip,
} from '../utils/publishing';
import toast from 'react-hot-toast';

interface Props {
  videoId: string;
  videoUrl: string;
  selectedClips: VideoClip[];
  selectedTags: string[];
  selectedMusic: MusicTrack | null;
  musicVolume: number;
  onClipRendered: (clipId: string, renderedVideoUrl: string) => void;
}

export default function ExportPanel({
  videoId,
  videoUrl,
  selectedClips,
  selectedTags,
  selectedMusic,
  musicVolume,
  onClipRendered,
}: Props) {
  const [videoTitle, setVideoTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exported, setExported] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'youtube' | 'instagram'>('youtube');
  const [copiedTags, setCopiedTags] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  const youtubeClips = selectedClips.filter(c => c.platform === 'youtube' || c.platform === 'both');
  const instagramClips = selectedClips.filter(c => c.platform === 'instagram' || c.platform === 'both');

  const getTitle = (clip: VideoClip) => videoTitle.trim() || clip.title;

  const getPayload = (clip: VideoClip, platform: PublishPlatform) => ({
    platform,
    clip,
    title: getTitle(clip),
    description: generateDescription(clip),
    tags: selectedTags,
    music: selectedMusic,
    musicVolume,
    renderedVideoUrl: clip.renderedVideoUrl,
  });

  const ensureRenderedClip = async (clip: VideoClip) => {
    if (clip.renderedVideoUrl) return clip;

    if (!apiBaseUrl) {
      throw new Error('Renderer API is not configured. Add VITE_API_BASE_URL to .env and run npm run server.');
    }

    const result = await renderClip({ videoId, videoUrl, clip });
    onClipRendered(clip.id, result.renderedVideoUrl);
    return { ...clip, renderedVideoUrl: result.renderedVideoUrl };
  };

  const handleExport = async (clipId: string, platform: PublishPlatform) => {
    const clip = selectedClips.find(c => c.id === clipId);
    if (!clip) return;

    setExportingId(clipId);

    try {
      const renderedClip = await ensureRenderedClip(clip);
      const result = await publishClip(getPayload(renderedClip, platform));
      setExported(prev => ({ ...prev, [`${clipId}_${platform}`] : true }));

      const destination = result.postUrl || result.url || result.studioUrl;
      toast.success(result.message || `"${clip.title}" published to ${platform === 'youtube' ? 'YouTube Shorts' : 'Instagram Reels'}.`, {
        duration: 4500,
        style: { background: '#1a1a2e', color: 'white' },
      });

      if (destination) window.open(destination, '_blank');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publish failed. Check the publishing API logs.', {
        duration: 6500,
        style: { background: '#1a1a2e', color: 'white', border: '1px solid rgba(239,68,68,0.35)' },
      });
    } finally {
      setExportingId(null);
    }
  };

  const handleCopyTags = () => {
    const tagText = selectedTags.join(' ');
    navigator.clipboard.writeText(tagText);
    setCopiedTags(true);
    toast.success('Tags copied to clipboard!', {
      style: { background: '#1a1a2e', color: 'white' },
    });
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleDownload = async (clip: VideoClip) => {
    setDownloadingId(clip.id);

    try {
      let renderedClip = clip;

      if (!clip.renderedVideoUrl && apiBaseUrl) {
        toast.loading(`Rendering "${clip.title}" to MP4...`, { id: `render-${clip.id}` });
        renderedClip = await ensureRenderedClip(clip);
        toast.dismiss(`render-${clip.id}`);
      }

      const result = await downloadRenderedVideo(renderedClip, renderedClip.renderedVideoUrl);

      if (result === 'rendered') {
        toast.success(`Downloaded "${clip.title}" as MP4`, {
          duration: 3000,
          style: { background: '#1a1a2e', color: 'white' },
        });
        return;
      }

      if (result === 'fallback') {
        downloadPublishPackage(getPayload(renderedClip, activeTab));
        toast.success('Renderer unavailable, so a browser preview video and publish package were downloaded.', {
          duration: 5500,
          style: { background: '#1a1a2e', color: 'white' },
        });
        return;
      }

      downloadPublishPackage(getPayload(renderedClip, activeTab));
      toast.error('Could not create a video file. Downloaded publish package instead.', {
        duration: 5500,
        style: { background: '#1a1a2e', color: 'white', border: '1px solid rgba(239,68,68,0.35)' },
      });
    } catch (error) {
      toast.dismiss(`render-${clip.id}`);
      toast.error(error instanceof Error ? error.message : 'Download failed.', {
        duration: 6500,
        style: { background: '#1a1a2e', color: 'white', border: '1px solid rgba(239,68,68,0.35)' },
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const generateDescription = (clip: VideoClip) => {
    return buildDescription(clip, selectedTags, selectedMusic, musicVolume);
  };

  if (selectedClips.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="text-4xl mb-3">✂️</div>
        <p className="text-gray-400 font-medium">Select clips to enable export</p>
        <p className="text-gray-600 text-sm mt-1">Choose at least one clip from the list above</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Video Title */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-yellow-400" />
          <span className="text-white font-semibold text-sm">Video Title & Description</span>
        </div>
        {editingTitle ? (
          <div className="space-y-2">
            <input
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Enter your viral video title..."
              className="w-full bg-white/10 text-white px-3 py-2 rounded-xl outline-none border border-white/20 focus:border-yellow-400/50 text-sm"
              autoFocus
            />
            <button
              onClick={() => setEditingTitle(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-lg"
            >
              <Check className="w-3 h-3" /> Done
            </button>
          </div>
        ) : (
          <div
            onClick={() => setEditingTitle(true)}
            className="group cursor-pointer flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-yellow-400/30 transition-colors"
          >
            <span className={`text-sm flex-1 ${videoTitle ? 'text-white' : 'text-gray-500'}`}>
              {videoTitle || 'Click to add a viral video title...'}
            </span>
            <Edit3 className="w-3.5 h-3.5 text-gray-500 group-hover:text-yellow-400 transition-colors" />
          </div>
        )}
      </div>

      {/* Tags panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">🏷️ Hashtags ({selectedTags.length})</span>
          </div>
          <button
            onClick={handleCopyTags}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copiedTags ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {copiedTags ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedTags ? 'Copied!' : 'Copy All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.length > 0 ? selectedTags.map(tag => (
            <span key={tag} className="text-xs bg-white/5 text-gray-300 px-2 py-1 rounded-full border border-white/10">
              {tag}
            </span>
          )) : (
            <span className="text-xs text-gray-600">No tags selected. Go to Trending Tags to pick some.</span>
          )}
        </div>
      </div>

      {/* Publishing API status */}
      <div className={`border rounded-2xl p-4 flex items-start gap-3 ${
        apiBaseUrl ? 'bg-green-500/10 border-green-500/25' : 'bg-yellow-500/10 border-yellow-500/25'
      }`}>
        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${apiBaseUrl ? 'text-green-400' : 'text-yellow-400'}`} />
        <div>
          <p className={`text-sm font-semibold ${apiBaseUrl ? 'text-green-300' : 'text-yellow-300'}`}>
            {apiBaseUrl ? 'Renderer + publish API connected' : 'Renderer API not configured'}
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            {apiBaseUrl
              ? `Downloads render real MP4 files via ${apiBaseUrl}/api/render. Publish uses ${apiBaseUrl}/api/publish/{platform}.`
              : 'Copy .env.example to .env, then run npm run dev:all to start frontend + renderer backend.'}
          </p>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
              activeTab === 'youtube'
                ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                : 'text-gray-400 hover:text-white border-b border-white/10'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3.01 3.01 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5a3.01 3.01 0 00-2.1 2.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3.01 3.01 0 002.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3.01 3.01 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
            YouTube Shorts ({youtubeClips.length})
            <span className="text-xs opacity-70">≤3 min</span>
          </button>
          <button
            onClick={() => setActiveTab('instagram')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
              activeTab === 'instagram'
                ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white border-b border-white/10'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram Reels ({instagramClips.length})
            <span className="text-xs opacity-70">≤1 min</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <AnimatePresence mode="wait">
            {(activeTab === 'youtube' ? youtubeClips : instagramClips).map((clip) => {
              const exportKey = `${clip.id}_${activeTab}`;
              const isExporting = exportingId === clip.id;
              const isDownloading = downloadingId === clip.id;
              const isDone = exported[exportKey];

              return (
                <motion.div
                  key={clip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h5 className="text-white font-semibold text-sm">{clip.title}</h5>
                      <p className="text-gray-500 text-xs mt-0.5">{clip.duration}s · {formatTime(clip.startTime)} → {formatTime(clip.endTime)}</p>
                    </div>
                    {isDone && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Exported
                      </span>
                    )}
                  </div>

                  {/* Generated description preview */}
                  <div className="mb-3 p-2.5 bg-white/5 rounded-lg text-xs text-gray-400 line-clamp-2">
                    {generateDescription(clip)}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(clip.id, activeTab)}
                      disabled={isExporting}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        isExporting
                          ? 'opacity-60 cursor-not-allowed'
                          : isDone
                          ? `bg-green-500/20 text-green-400 border border-green-500/30`
                          : activeTab === 'youtube'
                          ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30 shadow-md'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-purple-500/30 shadow-md'
                      }`}
                    >
                      {isExporting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : isDone ? (
                        <>
                          <Check className="w-4 h-4" />
                          Open {activeTab === 'youtube' ? 'YouTube Studio' : 'Instagram'}
                          <ExternalLink className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          {apiBaseUrl ? 'Publish to' : 'Send to'} {activeTab === 'youtube' ? 'YouTube' : 'Instagram'}
                          <ExternalLink className="w-3 h-3" />
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(clip)}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-sm transition-colors border border-white/10 disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline text-xs">{isDownloading ? 'Rendering...' : 'Download'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {(activeTab === 'youtube' ? youtubeClips : instagramClips).length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No {activeTab === 'youtube' ? 'YouTube' : 'Instagram'} clips selected.
                <br />
                <span className="text-xs">Select clips compatible with this platform.</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
