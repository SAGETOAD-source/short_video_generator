import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, Clock, Zap, ChevronDown, ChevronUp, Edit3, Check } from 'lucide-react';
import { VideoClip } from '../types';
import { formatTime } from '../utils/mockData';

interface Props {
  clip: VideoClip;
  index: number;
  onSelect: (id: string) => void;
  isSelected: boolean;
  onCaptionEdit: (id: string, caption: string) => void;
  onTitleEdit: (id: string, title: string) => void;
}

const platformColors = {
  youtube: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', label: 'YouTube (≤3 min)' },
  instagram: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Instagram (≤1 min)' },
  both: { bg: 'bg-gradient-to-r from-red-500/10 to-purple-500/10', border: 'border-pink-500/30', text: 'text-pink-400', label: 'YouTube + Instagram' },
};

export default function ClipCard({ clip, index, onSelect, isSelected, onCaptionEdit, onTitleEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [captionText, setCaptionText] = useState(clip.caption);
  const [titleText, setTitleText] = useState(clip.title);
  const platform = platformColors[clip.platform];

  const hookColor =
    clip.hookScore >= 95 ? 'text-red-400' :
    clip.hookScore >= 90 ? 'text-orange-400' :
    clip.hookScore >= 85 ? 'text-yellow-400' : 'text-green-400';

  const durationWarning = clip.platform === 'instagram' && clip.duration > 60
    ? '⚠️ Exceeds 1 min limit for Instagram'
    : clip.platform === 'youtube' && clip.duration > 180
    ? '⚠️ Exceeds 3 min limit for YouTube'
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card rounded-2xl overflow-hidden ${
        isSelected
          ? 'border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.15)] bg-white/[0.04]'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex gap-4 p-4">
        {/* Thumbnail - 9:16 miniature */}
        <div className="relative flex-shrink-0 w-14 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '9/16' }}>
          <img
            src={clip.thumbnail}
            alt={clip.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-1 inset-x-0 text-center">
            <span className="text-white text-[9px] font-bold">{formatTime(clip.duration)}</span>
          </div>
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <span className="text-[7px] text-white/70 bg-black/50 px-1 rounded">9:16</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Hook score badge */}
          <div className="flex items-center gap-2 mb-1">
            <div className={`flex items-center gap-1 text-xs font-bold ${hookColor}`}>
              <Zap className="w-3 h-3" />
              {clip.hookScore}% Hook Score
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full border ${platform.bg} ${platform.border} ${platform.text}`}>
              {platform.label}
            </div>
          </div>

          {/* Title */}
          {editingTitle ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="flex-1 bg-white/10 text-white text-sm font-semibold px-2 py-1 rounded-lg outline-none border border-white/20 focus:border-red-400/50"
                autoFocus
              />
              <button onClick={() => { onTitleEdit(clip.id, titleText); setEditingTitle(false); }}
                className="text-green-400 hover:text-green-300">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group mb-1">
              <h4 className="text-white font-semibold text-sm truncate">{titleText}</h4>
              <button onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity">
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Time range */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Clock className="w-3 h-3" />
            <span>{formatTime(clip.startTime)} → {formatTime(clip.endTime)}</span>
            <span className="mx-1">·</span>
            <Scissors className="w-3 h-3" />
            <span>{clip.duration}s</span>
          </div>

          {durationWarning && (
            <div className="text-xs text-yellow-400 mb-2">{durationWarning}</div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {clip.trendTags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-full border border-white/10">
                {tag}
              </span>
            ))}
            {clip.trendTags.length > 3 && (
              <span className="text-xs text-gray-600">+{clip.trendTags.length - 3}</span>
            )}
          </div>
        </div>

        {/* Select button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => onSelect(clip.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
              isSelected
                ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                : 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            {isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-600 hover:text-gray-400 border-t border-white/5 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide details' : 'Edit caption & details'}
      </button>

      {/* Expanded section */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4 space-y-4 border-t border-white/5"
        >
          {/* Viral reason */}
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-xs text-green-400 font-semibold mb-1">🧠 Why This Will Go Viral:</p>
            <p className="text-xs text-gray-300">{clip.viralReason}</p>
          </div>

          {/* Caption editor */}
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">
              📝 Caption (auto-generated, editable)
            </label>
            {editingCaption ? (
              <div className="space-y-2">
                <textarea
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={3}
                  className="w-full bg-white/10 text-white text-sm px-3 py-2 rounded-xl outline-none border border-white/20 focus:border-red-400/50 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { onCaptionEdit(clip.id, captionText); setEditingCaption(false); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 text-xs rounded-lg hover:bg-green-500/30 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => { setCaptionText(clip.caption); setEditingCaption(false); }}
                    className="px-3 py-1.5 bg-white/10 text-gray-400 text-xs rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingCaption(true)}
                className="group cursor-pointer p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/25 transition-colors"
              >
                <p className="text-sm text-gray-300 leading-relaxed">{captionText}</p>
                <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-400 transition-colors">
                  Click to edit caption →
                </p>
              </div>
            )}
          </div>

          {/* All tags */}
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1.5">🏷️ Hashtags</label>
            <div className="flex flex-wrap gap-1">
              {clip.trendTags.map((tag) => (
                <span key={tag} className="text-xs bg-white/5 text-gray-300 px-2 py-1 rounded-full border border-white/10">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
