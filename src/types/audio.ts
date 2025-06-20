export interface AudioClip {
  _id: string;
  title: string;
  audioUrl: string;
  category: 'long-talks' | 'random' | 'camps-arts' | 'warnings';
  filename: string;
  transcript?: string;
  createdAt: number;
}

export interface PlaybackState {
  currentClipId: string;
  volume: number;
  isPlaying: boolean;
  currentTime: number;
  lastUpdated: number;
} 