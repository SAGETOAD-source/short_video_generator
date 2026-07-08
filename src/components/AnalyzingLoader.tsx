import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  { emoji: '🔍', text: 'Fetching YouTube metadata...', color: 'text-blue-400' },
  { emoji: '📝', text: 'Downloading transcript & captions...', color: 'text-purple-400' },
  { emoji: '🧠', text: 'Scoring hook moments in first 3 seconds...', color: 'text-green-400' },
  { emoji: '✂️', text: 'Selecting best cut points for Shorts/Reels...', color: 'text-yellow-400' },
  { emoji: '📈', text: 'Matching trending hashtags to clip content...', color: 'text-pink-400' },
  { emoji: '📐', text: 'Preparing 9:16 vertical exports...', color: 'text-cyan-400' },
  { emoji: '🚀', text: 'Finalizing downloadable shorts...', color: 'text-orange-400' },
];

interface Props {
  videoId: string;
}

export default function AnalyzingLoader({ videoId }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) return prev + 1;
        return 100;
      });
    }, 48);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-2xl mx-auto text-center py-12"
    >
      {/* Animated thumbnail */}
      <div className="relative mx-auto mb-8 w-48 h-28 rounded-xl overflow-hidden">
        <img
          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
        </div>
        {/* Scanning beam */}
        <motion.div
          className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        AI is Analyzing Your Video
      </h2>
      <p className="text-gray-400 mb-8">Finding the most viral, hook-worthy moments...</p>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-2 mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2 text-left max-w-sm mx-auto">
        <AnimatePresence>
          {steps.slice(0, currentStep + 1).map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: i === currentStep ? 1 : 0.5, x: 0 }}
              className={`flex items-center gap-3 text-sm ${i === currentStep ? step.color : 'text-gray-500'}`}
            >
              <span className="text-lg">{step.emoji}</span>
              <span>{step.text}</span>
              {i < currentStep && (
                <span className="ml-auto text-green-400 text-xs">✓</span>
              )}
              {i === currentStep && (
                <span className="ml-auto">
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce mx-0.5" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-gray-600 text-xs mt-8">
        🤖 Powered by AI Hook Detection Engine v2.0 · Trend-Aware Clip Selection
      </p>
    </motion.div>
  );
}
