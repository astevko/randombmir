import { useFireproof } from 'use-fireproof';
import { AudioClip } from '@/types/audio';
import fs from 'fs';
import path from 'path';

// Audio data structure based on your existing files
const audioData: Omit<AudioClip, '_id'>[] = [
  // Long talks
  {
    title: "Trans",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/long+talks/01+trans.mp3",
    category: "long-talks",
    filename: "01+trans.mp3",
    transcript: "Sample transcript for trans...",
    createdAt: Date.now(),
  },
  {
    title: "Potty Apocalypse",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/long+talks/02+potty+appocalipse.mp3",
    category: "long-talks",
    filename: "02+potty+appocalipse.mp3",
    transcript: "Sample transcript for potty apocalypse...",
    createdAt: Date.now(),
  },
  {
    title: "Native",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/long+talks/03+native.mp3",
    category: "long-talks",
    filename: "03+native.mp3",
    transcript: "Sample transcript for native...",
    createdAt: Date.now(),
  },

  // Camps and Arts
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

  // Random
  {
    title: "Chiptune",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/random/01+chiptune.mp3",
    category: "random",
    filename: "01+chiptune.mp3",
    transcript: "Sample transcript for chiptune...",
    createdAt: Date.now(),
  },
  {
    title: "Butt",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/random/02+butt.mp3",
    category: "random",
    filename: "02+butt.mp3",
    transcript: "Sample transcript for butt...",
    createdAt: Date.now(),
  },
  {
    title: "Gate Time 1",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/random/03+gate+time+1.mp3",
    category: "random",
    filename: "03+gate+time+1.mp3",
    transcript: "Sample transcript for gate time...",
    createdAt: Date.now(),
  },

  // Warnings
  {
    title: "Boundaries",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/warnings/01+boundaries.mp3",
    category: "warnings",
    filename: "01+boundaries.mp3",
    transcript: "Sample transcript for boundaries...",
    createdAt: Date.now(),
  },
  {
    title: "VIP",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/warnings/02+vip.mp3",
    category: "warnings",
    filename: "02+vip.mp3",
    transcript: "Sample transcript for VIP...",
    createdAt: Date.now(),
  },
  {
    title: "Water Truck",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/warnings/03+watertruck.mp3",
    category: "warnings",
    filename: "03+watertruck.mp3",
    transcript: "Sample transcript for water truck...",
    createdAt: Date.now(),
  },
];

export async function importAudioData() {
  const { database } = useFireproof("bmir-audio-player");
  
  console.log('Importing audio data...');
  
  for (const clip of audioData) {
    try {
      await database.put(clip);
      console.log(`✅ Imported: ${clip.title}`);
    } catch (error) {
      console.error(`❌ Failed to import ${clip.title}:`, error);
    }
  }
  
  console.log('Import complete!');
}

// Function to read actual titles from .title files
export function readActualTitles(): Record<string, string> {
  const titles: Record<string, string> = {};
  const audioDir = path.join(process.cwd(), '..', 'audio_files');
  
  try {
    const files = fs.readdirSync(audioDir);
    
    for (const file of files) {
      if (file.endsWith('.title')) {
        const filename = file.replace('.title', '.mp3');
        const titlePath = path.join(audioDir, file);
        
        try {
          const content = fs.readFileSync(titlePath, 'utf-8');
          // Extract title from the file content
          const lines = content.split('\n');
          for (const line of lines) {
            if (line.startsWith('## Your Title:')) {
              const title = line.replace('## Your Title:', '').trim();
              if (title && title !== '[Enter your title here]') {
                titles[filename] = title;
                break;
              }
            }
          }
        } catch (error) {
          console.error(`Error reading title file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error reading audio directory:', error);
  }
  
  return titles;
} 