import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Scissors, RotateCcw, ChevronRight, Sparkles, Info } from 'lucide-react';
import HeroSection from './components/HeroSection';
import URLInput from './components/URLInput';
import AnalyzingLoader from './components/AnalyzingLoader';
import ClipCard from './components/ClipCard';
import TrendingSection from './components/TrendingSection';
import MusicPicker from './components/MusicPicker';
import ShortPreview from './components/ShortPreview';
import ExportPanel from './components/ExportPanel';
import { VideoAnalysis, VideoClip, Step } from './types';
import { generateMockAnalysis, MUSIC_TRACKS } from './utils/mockData';
import { analyzeVideo } from './utils/analysis';
import { getApiBaseUrl, renderClip } from './utils/publishing';
import toast from 'react-hot-toast';

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMusicId, setSelectedMusicId] = useState<string>('m1');
  const [musicVolume, setMusicVolume] = useState(18);
  const [previewClip, setPreviewClip] = useState<VideoClip | null>(null);

  const handleAnalyze = (url: string, id: string) => {
    setVideoUrl(url);
    setVideoId(id);
    setStep('analyzing');
  };

  useEffect(() => {
    if (step !== 'analyzing' || !videoId) return;

    let cancelled = false;

    const runAnalysis = async () => {
      try {
        const data = await analyzeVideo(videoUrl, videoId);
        if (cancelled) return;

        setAnalysis(data);
        const defaultTags = data.trends
          .filter((trend) => trend.hot)
          .slice(0, 5)
          .map((trend) => trend.tag);
        setSelectedTags(defaultTags.length > 0 ? defaultTags : data.trends.slice(0, 4).map((trend) => trend.tag));
        setSelectedClipIds(data.clips.slice(0, 2).map((clip) => clip.id));
        setPreviewClip(data.clips[0]);
        setStep('results');
        toast.success(`Found ${data.clips.length} hook-based shorts from real video analysis.`, {
          style: { background: '#1a1a2e', color: 'white' },
        });
      } catch (error) {
        if (cancelled) return;

        const data = generateMockAnalysis(videoId, videoUrl);
        setAnalysis(data);
        const defaultTags = data.trends
          .filter((trend) => trend.hot)
          .slice(0, 5)
          .map((trend) => trend.tag);
        setSelectedTags(defaultTags.length > 0 ? defaultTags : data.trends.slice(0, 4).map((trend) => trend.tag));
        setSelectedClipIds([data.clips[0].id, data.clips[1].id]);
        setPreviewClip(data.clips[0]);
        setStep('results');
        toast.error(
          error instanceof Error
            ? `${error.message} Using fallback clips for now.`
            : 'Real analysis failed. Using fallback clips.',
          { duration: 6500, style: { background: '#1a1a2e', color: 'white' } },
        );
      }
    };

    runAnalysis();
    return () => {
      cancelled = true;
    };
  }, [step, videoId, videoUrl]);

  useEffect(() => {
    if (!previewClip || previewClip.renderedVideoUrl || !videoUrl || !videoId) return;
    if (!getApiBaseUrl()) return;

    let cancelled = false;

    const renderPreview = async () => {
      try {
        const previewMusic = MUSIC_TRACKS.find((track) => track.id === selectedMusicId) || null;
        const result = await renderClip({
          videoId,
          videoUrl,
          clip: previewClip,
          music: previewMusic,
          musicVolume,
        });
        if (cancelled) return;

        setAnalysis((current) => {
          if (!current) return current;
          return {
            ...current,
            clips: current.clips.map((clip) =>
              clip.id === previewClip.id
                ? { ...clip, renderedVideoUrl: result.renderedVideoUrl, status: 'done' }
                : clip,
            ),
          };
        });
        setPreviewClip((current) =>
          current?.id === previewClip.id
            ? { ...current, renderedVideoUrl: result.renderedVideoUrl, status: 'done' }
            : current,
        );
      } catch {
        // Preview render is best-effort
      }
    };

    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [previewClip?.id, videoId, videoUrl, previewClip?.renderedVideoUrl, selectedMusicId, musicVolume]);

  const toggleClipSelect = (id: string) => {
    setSelectedClipIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    const clip = analysis?.clips.find(c => c.id === id);
    if (clip) setPreviewClip(clip);
  };

  const handleCaptionEdit = (id: string, caption: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      clips: analysis.clips.map(c => c.id === id ? { ...c, caption } : c),
    });
  };

  const handleTitleEdit = (id: string, title: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      clips: analysis.clips.map(c => c.id === id ? { ...c, title } : c),
    });
  };

  const handleClipRendered = (clipId: string, renderedVideoUrl: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      clips: analysis.clips.map((clip) =>
        clip.id === clipId ? { ...clip, renderedVideoUrl, status: 'done' } : clip,
      ),
    });
    setPreviewClip((current) =>
      current?.id === clipId ? { ...current, renderedVideoUrl, status: 'done' } : current,
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const selectedMusic = MUSIC_TRACKS.find(m => m.id === selectedMusicId) || null;
  const selectedClips = analysis?.clips.filter(c => selectedClipIds.includes(c.id)) || [];

  const handleReset = () => {
    setStep('input');
    setVideoUrl('');
    setVideoId('');
    setAnalysis(null);
    setSelectedClipIds([]);
    setPreviewClip(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-x-hidden selection:bg-purple-500/30">
      <Toaster position="top-right" />

      {/* Premium ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        
        {/* Subtle noise texture or grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header nav */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-14"
        >
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-[1px] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-shadow">
              <div className="w-full h-full rounded-2xl bg-[#050505] flex items-center justify-center">
                <Scissors className="w-5 h-5 text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-fuchsia-400" />
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                ShortsCraft
              </div>
              <div className="text-white/40 text-[10px] font-medium tracking-widest uppercase mt-0.5">Studio Edition</div>
            </div>
          </div>

          {step !== 'input' && (
            <div className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-white/40 bg-white/[0.03] p-1 rounded-full border border-white/[0.05]">
                {['input', 'analyzing', 'results'].map((s, i) => {
                  const isActive = step === s;
                  const isPast = ['analyzing', 'results'].indexOf(step) > ['input', 'analyzing', 'results'].indexOf(s);
                  return (
                    <span key={s} className="flex items-center">
                      <span className={`px-3 py-1 rounded-full transition-colors ${
                        isActive ? 'bg-white/10 text-white' :
                        isPast ? 'text-white/70' : ''
                      }`}>
                        {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                      </span>
                    </span>
                  );
                })}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] text-white/70 hover:text-white rounded-xl text-sm font-medium transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Video
              </button>
            </div>
          )}
        </motion.header>

        {/* ============ STEP: INPUT ============ */}
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HeroSection />
              <URLInput onAnalyze={handleAnalyze} loading={false} />

              {/* Info cards */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
              >
                {[
                  {
                    emoji: '🎯',
                    title: 'Hook-First Detection',
                    desc: 'AI identifies the exact moment that will stop scrollers dead — first 3 seconds are everything.',
                    color: 'from-red-500/10 to-orange-500/10 border-red-500/20',
                  },
                  {
                    emoji: '📐',
                    title: '9:16 Auto Format',
                    desc: 'YouTube Shorts (up to 3 min) and Instagram Reels (up to 1 min) — properly cropped, never stretched.',
                    color: 'from-purple-500/10 to-blue-500/10 border-purple-500/20',
                  },
                  {
                    emoji: '🚀',
                    title: '1-Click Publish',
                    desc: 'Auto-generated viral titles, captions, hashtags and direct share to YouTube & Instagram.',
                    color: 'from-green-500/10 to-teal-500/10 border-green-500/20',
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className={`bg-gradient-to-br ${card.color} border rounded-2xl p-5`}
                  >
                    <div className="text-3xl mb-3">{card.emoji}</div>
                    <h3 className="text-white font-bold text-base mb-1">{card.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Platform limits info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-8 max-w-2xl mx-auto flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl"
              >
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong className="text-blue-400">Platform Limits:</strong> YouTube Shorts allows up to <strong className="text-white">3 minutes (180s)</strong> per clip.
                  Instagram Reels max is <strong className="text-white">1 minute (60s)</strong>. ShortsCraft automatically respects these limits
                  and tags each clip with the compatible platform.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ============ STEP: ANALYZING ============ */}
          {step === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyzingLoader videoId={videoId} />
            </motion.div>
          )}

          {/* ============ STEP: RESULTS ============ */}
          {step === 'results' && analysis && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Video info bar */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-3xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center gap-5"
              >
                <div className="relative">
                  <img
                    src={analysis.thumbnail}
                    alt="Video"
                    className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-400 text-[11px] font-bold uppercase tracking-wider">Analysis Complete</span>
                    </div>
                  </div>
                  <p className="text-white/90 font-display font-semibold text-lg truncate">YouTube Video · ID: {videoId}</p>
                  <p className="text-white/50 text-sm mt-1">
                    Found <strong className="text-white/90 font-semibold">{analysis.clips.length} viral clips</strong> ·
                    {' '}<strong className="text-white/90 font-semibold">{selectedClipIds.length} selected</strong>
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-center px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl min-w-[100px]">
                    <div className="text-white font-display font-bold text-2xl">{analysis.clips.length}</div>
                    <div className="text-white/40 text-xs font-medium uppercase tracking-wider mt-1">Clips</div>
                  </div>
                  <div className="text-center px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl min-w-[100px]">
                    <div className="text-white font-display font-bold text-2xl">{analysis.trends.filter(t => t.hot).length}</div>
                    <div className="text-white/40 text-xs font-medium uppercase tracking-wider mt-1">Trends</div>
                  </div>
                </div>
              </motion.div>

              {/* Main 3-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Clips */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-white font-display font-bold text-2xl flex items-center gap-2.5">
                      <div className="p-1.5 bg-violet-500/10 rounded-lg">
                        <Scissors className="w-5 h-5 text-violet-400" />
                      </div>
                      Viral Clips
                    </h2>
                    <span className="text-sm font-medium text-white/40 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">
                      {selectedClipIds.length}/{analysis.clips.length} selected
                    </span>
                  </div>

                  {analysis.clips.map((clip, i) => (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      index={i}
                      isSelected={selectedClipIds.includes(clip.id)}
                      onSelect={toggleClipSelect}
                      onCaptionEdit={handleCaptionEdit}
                      onTitleEdit={handleTitleEdit}
                    />
                  ))}

                  {/* Trending + Music */}
                  <div className="space-y-4 mt-6">
                    <TrendingSection
                      trends={analysis.trends}
                      selectedTags={selectedTags}
                      onToggleTag={toggleTag}
                    />
                    <MusicPicker
                      tracks={MUSIC_TRACKS}
                      selected={selectedMusicId}
                      onSelect={setSelectedMusicId}
                      volume={musicVolume}
                      onVolumeChange={setMusicVolume}
                    />
                  </div>

                  {/* Export panel */}
                  <div className="mt-6">
                    <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                      <span>🚀</span> Export & Publish
                    </h2>
                    <ExportPanel
                      videoId={videoId}
                      videoUrl={videoUrl}
                      selectedClips={selectedClips}
                      selectedTags={selectedTags}
                      selectedMusic={selectedMusic}
                      musicVolume={musicVolume}
                      onClipRendered={handleClipRendered}
                    />
                  </div>
                </div>

                {/* Right: Preview */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6 space-y-4">
                    <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                      📱 Live Preview
                    </h2>

                    {previewClip ? (
                      <ShortPreview
                        clip={previewClip}
                        musicName={selectedMusic?.name}
                        musicVolume={musicVolume}
                      />
                    ) : (
                      <div className="text-center py-16 text-gray-600 text-sm">
                        Select a clip to preview
                      </div>
                    )}

                    {/* Clip selector for preview */}
                    <div className="space-y-1.5 mt-4">
                      <p className="text-xs text-gray-500 mb-2">Preview clip:</p>
                      {analysis.clips.map((clip) => (
                        <button
                          key={clip.id}
                          onClick={() => setPreviewClip(clip)}
                          className={`w-full text-left px-4 py-3 rounded-2xl text-sm transition-all duration-300 ${
                            previewClip?.id === clip.id
                              ? 'bg-violet-500/10 border border-violet-500/30 text-violet-200 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]'
                              : 'bg-white/[0.02] border border-white/[0.05] text-white/60 hover:bg-white/[0.04] hover:border-white/[0.1] hover:text-white/90'
                          }`}
                        >
                          <span className="font-medium truncate block font-display">{clip.title}</span>
                          <span className="text-white/40 text-xs mt-1 block">{clip.duration}s · Hook Score <strong className="text-white/70">{clip.hookScore}%</strong></span>
                        </button>
                      ))}
                    </div>

                    {/* Format info card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-4 space-y-2">
                      <h4 className="text-white font-semibold text-sm">📐 Format Details</h4>
                      {[
                        { label: 'Aspect Ratio', value: '9:16 (Vertical)', icon: '📱' },
                        { label: 'YouTube Limit', value: '≤ 3 min (180s)', icon: '🔴' },
                        { label: 'Instagram Limit', value: '≤ 1 min (60s)', icon: '💜' },
                        { label: 'Resolution', value: '1080 × 1920 px', icon: '🎬' },
                        { label: 'Music Mix', value: `${musicVolume}% bg / ${100 - musicVolume}% video`, icon: '🎵' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1">{row.icon} {row.label}</span>
                          <span className="text-gray-300 font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 mt-16 border-t border-white/5">
        <p className="text-gray-700 text-xs">
          ShortsCraft · AI-powered viral shorts generator · 9:16 format · YouTube &amp; Instagram ready
        </p>
      </footer>
    </div>
  );
}
