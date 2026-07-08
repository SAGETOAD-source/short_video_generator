import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, ArrowRight, AlertCircle } from 'lucide-react';
import { extractVideoId } from '../utils/mockData';

interface Props {
  onAnalyze: (url: string, videoId: string) => void;
  loading: boolean;
}

const exampleUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
];

export default function URLInput({ onAnalyze, loading }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a YouTube URL');
      return;
    }
    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      setError('Invalid YouTube URL. Please paste a valid youtube.com or youtu.be link.');
      return;
    }
    onAnalyze(trimmed, videoId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="max-w-3xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-white/5 border border-white/15 rounded-2xl p-2 backdrop-blur-sm focus-within:border-red-500/50 focus-within:bg-white/8 transition-all duration-300 shadow-2xl">
          <div className="flex items-center gap-3 pl-4 pr-2 flex-1">
            <Link2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              placeholder="Paste YouTube link here... e.g. https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base py-3 min-w-0"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Create Shorts</span>
                <span className="sm:hidden">Go</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-3 text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
        <span className="text-gray-600 text-xs">Try:</span>
        {exampleUrls.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setUrl(ex)}
            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
          >
            Example {i + 1}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
