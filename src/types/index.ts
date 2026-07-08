export interface VideoClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  hookScore: number;
  trendTags: string[];
  caption: string;
  platform: 'youtube' | 'instagram' | 'both';
  thumbnail: string;
  renderedVideoUrl?: string;
  status: 'ready' | 'processing' | 'done';
  viralReason: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  mood: string;
  emoji: string;
}

export interface TrendTag {
  tag: string;
  views: string;
  growth: string;
  hot: boolean;
}

export interface VideoAnalysis {
  videoId: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  clips: VideoClip[];
  trends: TrendTag[];
  suggestedMusic: MusicTrack[];
}

export type PlatformType = 'youtube' | 'instagram' | 'both';
export type Step = 'input' | 'analyzing' | 'results' | 'editor' | 'export';
