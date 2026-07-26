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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const hasVideo = Boolean(clip.renderedVideoUrl);

  const handlePlayToggle = async () => {
    if (hasVideo && videoRef.current) {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setPlaying(true);
      } else {
        videoRef.current.pause();
        setPlaying(false);
      }
      return;
    }

    setPlaying((prev) => {
      if (prev && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return !prev;
    });
  };

  useEffect(() => {
    if (hasVideo || !playing) return;

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
  }, [playing, clip.duration, hasVideo]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [clip.id, clip.renderedVideoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const captions = clip.caption.split(' ').reduce((acc: string[][], word, i) => {
    const groupIdx = Math.floor(i / 4);
    if (!acc[groupIdx]) acc[groupIdx] = [];
    acc[groupIdx].push(word);
    return acc;
  }, []);

  const currentCaptionGroup = hasVideo
    ? Math.floor(((videoRef.current?.currentTime || 0) / Math.max(clip.duration, 1)) * captions.length)
    : Math.floor((progress / 100) * captions.length);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 font-medium">
          {hasVideo ? '9:16 Rendered Short' : '9:16 Preview'}
        </span>
      </div>

      <div
        className="relative bg-black rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-[6px] border-[#1a1a1a] ring-1 ring-white/10"
        style={{ width: '280px', height: '580px' }}
      >
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
          <div className="w-24 h-5 bg-[#1a1a1a] rounded-b-xl" />
        </div>
        {hasVideo ? (
          <video
            ref={videoRef}
            src={clip.renderedVideoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted={muted}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setProgress((video.currentTime / Math.max(video.duration || clip.duration, 1)) * 100);
            }}
            onEnded={() => {
              setPlaying(false);
              setProgress(0);
            }}
          />
        ) : (
          <>
            <img
              src={clip.thumbnail}
              alt={clip.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
          </>
        )}

        <div className="absolute top-8 inset-x-5 flex items-center justify-between z-10">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[10px] text-white font-medium tracking-wide">
            9:16 FORMAT
          </div>
          <div className="bg-violet-500/80 backdrop-blur-md border border-violet-400/30 rounded-full px-3 py-1 text-[10px] text-white font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            {formatTime(clip.duration)}
          </div>
        </div>

        <button
          onClick={handlePlayToggle}
          className="absolute inset-0 flex items-center justify-center z-10"
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

        <AnimatePresence>
          {(playing || hasVideo) && captions[currentCaptionGroup] && (
            <motion.div
              key={currentCaptionGroup}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-24 inset-x-4 text-center z-10"
            >
              <span className="bg-white/95 text-black text-[15px] font-black px-4 py-2 rounded-xl leading-tight inline-block uppercase tracking-wider shadow-xl border border-white/20">
                {captions[currentCaptionGroup].join(' ')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {musicName && (
          <div className="absolute bottom-14 inset-x-4 flex items-center gap-2 z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 w-max">
            <div className="flex gap-0.5 items-end h-3">
              {[3, 6, 4, 8, 3].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] bg-white rounded-full"
                  animate={playing ? { height: [`${h}px`, `${h + 4}px`, `${h}px`] } : { height: `${h}px` }}
                  transition={{ duration: 0.4, delay: i * 0.08, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-white text-[10px] font-medium truncate max-w-[120px]">{musicName}</span>
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20 z-10">
          <div
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3 z-10">
          <button onClick={() => setMuted(!muted)} className="text-center">
            {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {!hasVideo && (
        <p className="text-[11px] text-gray-500 mt-2 text-center max-w-[180px]">
          Rendering 9:16 preview in background...
        </p>
      )}

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
