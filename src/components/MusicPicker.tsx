import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { MusicTrack } from '../types';

interface Props {
  tracks: MusicTrack[];
  selected: string | null;
  onSelect: (id: string) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export default function MusicPicker({ tracks, selected, onSelect, volume, onVolumeChange }: Props) {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <Music className="w-5 h-5 text-purple-400" />
        <h3 className="text-white font-bold text-lg">Background Music</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        🎵 Music plays at low volume so your video audio stays clear &amp; dominant
      </p>

      {/* Volume control */}
      <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-xl border border-white/10">
        <button onClick={() => onVolumeChange(0)} className="text-gray-400 hover:text-white transition-colors">
          <VolumeX className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #a855f7 ${volume}%, rgba(255,255,255,0.1) ${volume}%)`,
            }}
          />
        </div>
        <button onClick={() => onVolumeChange(100)} className="text-gray-400 hover:text-white transition-colors">
          <Volume2 className="w-4 h-4" />
        </button>
        <span className="text-purple-400 text-xs font-bold w-8 text-right">{volume}%</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tracks.map((track) => {
          const isSelected = selected === track.id;
          const isPlaying = playing === track.id;
          return (
            <motion.button
              key={track.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onSelect(track.id);
                setPlaying(isPlaying ? null : track.id);
              }}
              className={`flex items-start gap-2.5 p-3 rounded-xl text-left transition-all duration-200 border ${
                isSelected
                  ? 'bg-purple-500/20 border-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-2xl">{track.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{track.name}</div>
                <div className="text-xs text-gray-500">{track.genre} · {track.bpm} BPM</div>
                <div className={`text-xs mt-0.5 ${isSelected ? 'text-purple-400' : 'text-gray-600'}`}>
                  {track.mood}
                </div>
              </div>
              {isSelected && (
                <div className="flex gap-0.5 items-end h-5 mt-0.5">
                  {[3, 5, 4, 6, 3, 5].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-purple-400 rounded-full"
                      animate={{ height: [`${h}px`, `${h + 4}px`, `${h}px`] }}
                      transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
