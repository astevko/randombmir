import { useFireproof } from 'use-fireproof';
import { AudioClip, PlaybackState } from '@/types/audio';

// Sample audio data to seed the database
const sampleAudioClips: Omit<AudioClip, '_id'>[] = [
  {
    title: "Automatas Secret Gateway to Time Travel",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/01+secret.mp3",
    category: "camps-arts",
    filename: "01+secret.mp3",
    transcript: "Sample transcript for secret gateway...",
    createdAt: Date.now(),
  },
  {
    title: "Are you horny enough",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/02+horny.mp3",
    category: "camps-arts",
    filename: "02+horny.mp3",
    transcript: "Sample transcript for horny...",
    createdAt: Date.now(),
  },
  {
    title: "Dodge Ball Frenzy in Barbie Death Village",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/03+dodgeball.mp3",
    category: "camps-arts",
    filename: "03+dodgeball.mp3",
    transcript: "Sample transcript for dodgeball...",
    createdAt: Date.now(),
  },
  {
    title: "Trans",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/long+talks/01+trans.mp3",
    category: "long-talks",
    filename: "01+trans.mp3",
    transcript: "Sample transcript for trans...",
    createdAt: Date.now(),
  },
  {
    title: "Chiptune",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/random/01+chiptune.mp3",
    category: "random",
    filename: "01+chiptune.mp3",
    transcript: "Sample transcript for chiptune...",
    createdAt: Date.now(),
  },
];

export class AudioDatabase {
  private static instance: AudioDatabase;
  private initialized = false;

  private constructor() {}

  public static getInstance(): AudioDatabase {
    if (!AudioDatabase.instance) {
      AudioDatabase.instance = new AudioDatabase();
    }
    return AudioDatabase.instance;
  }

  async initializeDatabase() {
    if (this.initialized) return;
    
    const { database } = useFireproof("bmir-audio-player");
    
    // Check if we have any clips, if not, seed with sample data
    const existingClips = await database.query('category', { limit: 1 });
    if (existingClips.rows.length === 0) {
      console.log('Seeding database with sample audio clips...');
      for (const clip of sampleAudioClips) {
        await database.put(clip);
      }
    }
    
    this.initialized = true;
  }

  async getAllClips(): Promise<AudioClip[]> {
    const { database } = useFireproof("bmir-audio-player");
    const result = await database.query('category', { limit: 1000 });
    return result.docs as AudioClip[];
  }

  async getClipById(id: string): Promise<AudioClip | null> {
    const { database } = useFireproof("bmir-audio-player");
    try {
      const doc = await database.get(id);
      return doc as AudioClip;
    } catch (error) {
      console.error('Error getting clip by ID:', error);
      return null;
    }
  }

  async getRandomClip(): Promise<AudioClip | null> {
    const clips = await this.getAllClips();
    if (clips.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * clips.length);
    return clips[randomIndex];
  }

  async getNextClip(currentId: string): Promise<AudioClip | null> {
    const clips = await this.getAllClips();
    if (clips.length === 0) return null;
    
    const currentIndex = clips.findIndex(clip => clip._id === currentId);
    if (currentIndex === -1) return clips[0];
    
    const nextIndex = (currentIndex + 1) % clips.length;
    return clips[nextIndex];
  }

  async getPreviousClip(currentId: string): Promise<AudioClip | null> {
    const clips = await this.getAllClips();
    if (clips.length === 0) return null;
    
    const currentIndex = clips.findIndex(clip => clip._id === currentId);
    if (currentIndex === -1) return clips[0];
    
    const prevIndex = currentIndex === 0 ? clips.length - 1 : currentIndex - 1;
    return clips[prevIndex];
  }

  // Playback state management
  async getPlaybackState(): Promise<PlaybackState | null> {
    const { database } = useFireproof("bmir-audio-player");
    try {
      const doc = await database.get('playback-state');
      return doc as PlaybackState;
    } catch (error) {
      return null;
    }
  }

  async savePlaybackState(state: Partial<PlaybackState>): Promise<void> {
    const { database } = useFireproof("bmir-audio-player");
    const existingState = await this.getPlaybackState();
    const updatedState = {
      ...existingState,
      ...state,
      lastUpdated: Date.now(),
    };
    
    await database.put({
      _id: 'playback-state',
      ...updatedState,
    });
  }
}

export const audioDb = AudioDatabase.getInstance(); 