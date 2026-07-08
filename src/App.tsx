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
    if (step === 'analyzing' && videoId) {
      const timer = setTimeout(() => {
        const data = generateMockAnalysis(videoId, videoUrl);
        setAnalysis(data);
        const defaultTags = data.trends
          .filter((trend) => trend.hot)
          .slice(0, 5)
          .map((trend) => trend.tag);
        setSelectedTags(defaultTags.length > 0 ? defaultTags : data.trends.slice(0, 4).map((trend) => trend.tag));
        // Auto-select top 2 clips
        setSelectedClipIds([data.clips[0].id, data.clips[1].id]);
        setPreviewClip(data.clips[0]);
        setStep('results');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, videoId, videoUrl]);

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
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-x-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster position="top-right" />

      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/6 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
        {/* Header nav */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-14"
        >
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-black text-lg leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                ShortsCraft
              </div>
              <div className="text-gray-600 text-[10px]">AI Shorts Generator</div>
            </div>
          </div>

          {step !== 'input' && (
            <div className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="hidden md:flex items-center gap-1 text-xs text-gray-500">
                {['input', 'analyzing', 'results'].map((s, i) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === s ? 'bg-red-500 text-white' :
                      ['analyzing', 'results'].indexOf(step) > ['input', 'analyzing', 'results'].indexOf(s) ? 'bg-green-500/20 text-green-400' :
                      'bg-white/10 text-gray-600'
                    }`}>{i + 1}</span>
                    {i < 2 && <ChevronRight className="w-3 h-3" />}
                  </span>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
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
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl mb-8"
              >
                <img
                  src={analysis.thumbnail}
                  alt="Video"
                  className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-semibold">Analysis Complete!</span>
                  </div>
                  <p className="text-white font-semibold text-sm truncate">YouTube Video · ID: {videoId}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Found <strong className="text-white">{analysis.clips.length} viral clips</strong> ·
                    {' '}<strong className="text-white">{selectedClipIds.length} selected</strong>
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="text-center px-3 py-2 bg-white/5 rounded-xl">
                    <div className="text-white font-bold text-lg">{analysis.clips.length}</div>
                    <div className="text-gray-500 text-xs">Clips Found</div>
                  </div>
                  <div className="text-center px-3 py-2 bg-white/5 rounded-xl">
                    <div className="text-white font-bold text-lg">{analysis.trends.filter(t => t.hot).length}</div>
                    <div className="text-gray-500 text-xs">Hot Trends</div>
                  </div>
                </div>
              </motion.div>

              {/* Main 3-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Clips */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white font-bold text-xl flex items-center gap-2">
                      <Scissors className="w-5 h-5 text-red-400" />
                      AI-Detected Viral Clips
                    </h2>
                    <span className="text-xs text-gray-500">
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
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-200 ${
                            previewClip?.id === clip.id
                              ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                              : 'bg-white/5 border border-white/5 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <span className="font-medium truncate block">{clip.title}</span>
                          <span className="text-gray-600">{clip.duration}s · Hook {clip.hookScore}%</span>
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
