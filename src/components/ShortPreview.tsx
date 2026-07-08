import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { VideoClip } from '../types';
import { formatTime } from '../utils/mockData';

interface Props {
  clip: VideoClip;
  musicName?: string;
  musicVolume: number;
}

export default function ShortPreview({ clip, musicName, musicVolume }: Props) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const handlePlayToggle = () => {
    setPlaying((prev) => {
      if (prev && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return !prev;
    });
  };

  useEffect(() => {
    if (!playing) return;

    intervalRef.current = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 100 / (clip.duration * 10), 100);
        if (next >= 100) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, clip.duration]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [clip.id]);

  const captions = clip.caption.split(' ').reduce((acc: string[][], word, i) => {
    const groupIdx = Math.floor(i / 4);
    if (!acc[groupIdx]) acc[groupIdx] = [];
    acc[groupIdx].push(word);
    return acc;
  }, []);

  const currentCaptionGroup = Math.floor((progress / 100) * captions.length);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 font-medium">9:16 Preview</span>
      </div>

      {/* Phone frame */}
      <div
        className="relative bg-black rounded-[2rem] overflow-hidden shadow-2xl border-2 border-white/20"
        style={{ width: '160px', height: '284px' }}
      >
        {/* Thumbnail */}
        <img
          src={clip.thumbnail}
          alt={clip.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.3';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

        {/* Top overlay */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between">
          <div className="bg-black/60 rounded-full px-2 py-0.5 text-[9px] text-white font-bold">
            9:16 Shorts
          </div>
          <div className="bg-red-500 rounded-full px-2 py-0.5 text-[9px] text-white font-bold">
            {formatTime(clip.duration)}
          </div>
        </div>

        {/* Center play button */}
        <button
          onClick={handlePlayToggle}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            whileTap={{ scale: 0.85 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              playing ? 'bg-black/60' : 'bg-white/20'
            } backdrop-blur-sm border border-white/30`}
          >
            {playing ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white ml-0.5" />
            )}
          </motion.div>
        </button>

        {/* Caption overlay */}
        <AnimatePresence>
          {playing && captions[currentCaptionGroup] && (
            <motion.div
              key={currentCaptionGroup}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-14 inset-x-2 text-center"
            >
              <span className="bg-black/80 text-white text-[11px] font-black px-2 py-1 rounded-lg leading-tight inline-block uppercase tracking-wide" style={{ textShadow: '0 1px 3px black' }}>
                {captions[currentCaptionGroup].join(' ')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Music indicator */}
        {musicName && (
          <div className="absolute bottom-8 inset-x-2 flex items-center gap-1">
            <div className="flex gap-0.5 items-end">
              {[2, 4, 3, 5, 2].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-white rounded-full"
                  animate={playing ? { height: [`${h}px`, `${h + 3}px`, `${h}px`] } : { height: `${h}px` }}
                  transition={{ duration: 0.4, delay: i * 0.08, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-white text-[8px] truncate opacity-80">{musicName}</span>
            <span className="text-white/60 text-[8px]">{musicVolume}%</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Right side actions (TikTok style) */}
        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3">
          <div className="text-center">
            <div className="text-xl">❤️</div>
            <div className="text-[8px] text-white">Like</div>
          </div>
          <div className="text-center">
            <div className="text-xl">💬</div>
            <div className="text-[8px] text-white">Comment</div>
          </div>
          <button onClick={() => setMuted(!muted)} className="text-center">
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* Hook score */}
      <div className="mt-3 flex items-center gap-2">
        <div className="text-xs text-gray-500">Hook Score:</div>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full w-20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-red-400 rounded-full"
            style={{ width: `${clip.hookScore}%` }}
          />
        </div>
        <div className="text-xs font-bold text-red-400">{clip.hookScore}%</div>
      </div>
    </div>
  );
}
