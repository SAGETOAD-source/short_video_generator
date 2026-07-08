import { VideoAnalysis, MusicTrack, TrendTag } from '../types';

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'm1', name: 'Phonk Drive', genre: 'Phonk', bpm: 140, mood: 'Aggressive', emoji: '🔥' },
  { id: 'm2', name: 'Lo-Fi Chill', genre: 'Lo-Fi', bpm: 85, mood: 'Calm', emoji: '🌙' },
  { id: 'm3', name: 'Epic Cinematic', genre: 'Cinematic', bpm: 120, mood: 'Epic', emoji: '🎬' },
  { id: 'm4', name: 'Trap Vibes', genre: 'Trap', bpm: 160, mood: 'Hype', emoji: '💥' },
  { id: 'm5', name: 'EDM Rush', genre: 'EDM', bpm: 128, mood: 'Energetic', emoji: '⚡' },
  { id: 'm6', name: 'Motivational Rise', genre: 'Orchestral', bpm: 110, mood: 'Inspiring', emoji: '🚀' },
  { id: 'm7', name: 'Dark Ambient', genre: 'Ambient', bpm: 70, mood: 'Mysterious', emoji: '🌑' },
  { id: 'm8', name: 'Synthwave Retro', genre: 'Synthwave', bpm: 100, mood: 'Nostalgic', emoji: '🌆' },
];

export const TREND_TAGS: TrendTag[] = [
  { tag: '#shorts', views: '2.1T', growth: '+12%', hot: true },
  { tag: '#viral', views: '890B', growth: '+8%', hot: true },
  { tag: '#trending', views: '650B', growth: '+15%', hot: true },
  { tag: '#fyp', views: '1.4T', growth: '+20%', hot: true },
  { tag: '#motivation', views: '210B', growth: '+5%', hot: false },
  { tag: '#mindblowing', views: '180B', growth: '+18%', hot: true },
  { tag: '#lifehack', views: '95B', growth: '+9%', hot: false },
  { tag: '#reels', views: '540B', growth: '+11%', hot: true },
  { tag: '#explore', views: '320B', growth: '+7%', hot: false },
  { tag: '#shock', views: '145B', growth: '+22%', hot: true },
];

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function makePseudoRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildTrendTags(videoId: string, clipTags: string[]): TrendTag[] {
  const rand = makePseudoRandom(hashSeed(videoId));
  const curated = Array.from(new Set([...clipTags, ...TREND_TAGS.map((t) => t.tag)]));

  return curated.slice(0, 12).map((tag, index) => {
    const baseViews = 80 + Math.floor(rand() * 2400);
    const viewUnit = baseViews > 1000 ? 'B' : 'M';
    const viewValue = baseViews > 1000 ? `${(baseViews / 1000).toFixed(1)}T` : `${baseViews}B`;
    const growth = `+${Math.floor(4 + rand() * 28)}%`;
    const hot = index < 5 || rand() > 0.72;
    return {
      tag,
      views: viewUnit === 'M' ? `${Math.floor(10 + rand() * 900)}M` : viewValue,
      growth,
      hot,
    };
  });
}

export function generateMockAnalysis(videoId: string, _url: string): VideoAnalysis {
  const clips = [
    {
      id: 'c1',
      title: 'The Reveal Everyone Replays',
      startTime: 12,
      endTime: 47,
      duration: 35,
      hookScore: 97,
      trendTags: ['#shorts', '#viral', '#mindblowing', '#fyp', '#shock'],
      caption: 'This reveal flips the whole story in seconds. Watch till the end and tell me if you saw it coming.',
      platform: 'both' as const,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      status: 'ready' as const,
      viralReason: 'High emotional impact opening + shocking reveal moment drives maximum retention',
    },
    {
      id: 'c2',
      title: 'The 3-Second Hook That Works',
      startTime: 78,
      endTime: 133,
      duration: 55,
      hookScore: 94,
      trendTags: ['#trending', '#fyp', '#viral', '#shorts', '#reels'],
      caption: 'One short hook, one big payoff. If this hit, save it for later and share it with someone who needs the push.',
      platform: 'both' as const,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      status: 'ready' as const,
      viralReason: 'Pattern interrupt in first 2 seconds + emotional payoff keeps viewers watching',
    },
    {
      id: 'c3',
      title: 'The Aha Moment In 60 Seconds',
      startTime: 145,
      endTime: 205,
      duration: 60,
      hookScore: 91,
      trendTags: ['#lifehack', '#motivation', '#explore', '#fyp', '#shorts'],
      caption: 'Quick breakdown of the key move so you can apply it today. Save this and come back when you need a reset.',
      platform: 'youtube' as const,
      thumbnail: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      status: 'ready' as const,
      viralReason: 'Actionable insight delivered fast — drives saves & shares from value-seeking audiences',
    },
    {
      id: 'c4',
      title: 'The Debate That Split Opinions',
      startTime: 230,
      endTime: 283,
      duration: 53,
      hookScore: 89,
      trendTags: ['#shock', '#viral', '#trending', '#fyp', '#reels'],
      caption: 'This is the part people argue about most. Agree or disagree, drop your take in the comments.',
      platform: 'instagram' as const,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      status: 'ready' as const,
      viralReason: 'Controversial angle triggers comments & debate — algorithm loves engagement spikes',
    },
    {
      id: 'c5',
      title: 'High-Energy Climax Cut',
      startTime: 312,
      endTime: 492,
      duration: 180,
      hookScore: 88,
      trendTags: ['#shorts', '#viral', '#mindblowing', '#motivation', '#fyp'],
      caption: 'High-energy finish built for watch time. Keep this in your rotation for daily motivation.',
      platform: 'youtube' as const,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      status: 'ready' as const,
      viralReason: 'Extended 3-min YouTube Short with peak energy climax — maximizes watch time & subscriber conversion',
    },
  ];

  const trendUniverse = clips.flatMap((clip) => clip.trendTags);
  const trendTags = buildTrendTags(videoId, trendUniverse);

  return {
    videoId,
    title: 'Analyzed YouTube Video',
    channel: 'Original Creator',
    duration: 600,
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    clips,
    trends: trendTags,
    suggestedMusic: MUSIC_TRACKS.slice(0, 4),
  };
}
