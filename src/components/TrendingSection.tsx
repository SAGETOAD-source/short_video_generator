import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';
import { TrendTag } from '../types';

interface Props {
  trends: TrendTag[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export default function TrendingSection({ trends, selectedTags, onToggleTag }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="text-white font-bold text-lg">Trending Tags</h3>
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 ml-auto">
          Live Trends
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {trends.map((trend, i) => {
          const isSelected = selectedTags.includes(trend.tag);
          return (
            <motion.button
              key={trend.tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onToggleTag(trend.tag)}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                isSelected
                  ? 'bg-green-500/20 border-green-400/50 text-green-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
              }`}
            >
              {trend.hot && <Flame className="w-3 h-3 text-orange-400" />}
              <span>{trend.tag}</span>
              <span className={`text-xs ${isSelected ? 'text-green-400' : 'text-gray-600'}`}>
                {trend.views}
              </span>
              <span className="text-xs text-green-500">{trend.growth}</span>
            </motion.button>
          );
        })}
      </div>

      {selectedTags.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-1">Selected tags ({selectedTags.length}):</p>
          <p className="text-xs text-gray-300 break-all">{selectedTags.join(' ')}</p>
        </div>
      )}
    </motion.div>
  );
}
