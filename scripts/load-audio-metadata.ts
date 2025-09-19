import { fireproof } from 'use-fireproof';
import { AudioClip } from '../src/types/audio';
import * as fs from 'fs';
import * as path from 'path';

interface TitleFileData {
  title: string;
  transcriptPreview: string;
}

function parseTitleFile(content: string): TitleFileData {
  const lines = content.split('\n');
  let title = '';
  let transcriptPreview = '';

  for (const line of lines) {
    if (line.startsWith('## Your Title:')) {
      // Get the title from the next line
      const titleIndex = lines.indexOf(line);
      if (titleIndex + 1 < lines.length) {
        title = lines[titleIndex + 1].trim();
      }
    } else if (line.startsWith('## Transcript Preview:')) {
      // Get the transcript preview from the next line
      const previewIndex = lines.indexOf(line);
      if (previewIndex + 1 < lines.length) {
        transcriptPreview = lines[previewIndex + 1].trim();
      }
    }
  }

  // Fallback: if no "Your Title" found, try to extract from "Current Title"
  if (!title) {
    for (const line of lines) {
      if (line.startsWith('## Current Title (from first sentence):')) {
        const titleIndex = lines.indexOf(line);
        if (titleIndex + 1 < lines.length) {
          title = lines[titleIndex + 1].trim();
        }
      }
    }
  }

  return { title, transcriptPreview };
}

function determineCategory(filename: string): 'long-talks' | 'random' | 'camps-arts' | 'warnings' {
  // Extract the number prefix to determine category
  const match = filename.match(/^(\d+)/);
  if (!match) return 'random';
  
  const number = parseInt(match[1]);
  
  // Based on the file structure, categorize by number ranges
  if (number >= 1 && number <= 10) return 'warnings';
  if (number >= 11 && number <= 20) return 'camps-arts';
  if (number >= 21 && number <= 30) return 'random';
  if (number >= 31 && number <= 40) return 'long-talks';
  if (number >= 41 && number <= 50) return 'warnings';
  if (number >= 51 && number <= 60) return 'camps-arts';
  if (number >= 61 && number <= 70) return 'random';
  if (number >= 71 && number <= 80) return 'long-talks';
  
  return 'random';
}

function generateAudioUrl(filename: string, category: string): string {
  // Convert category to URL format
  const categoryUrl = category === 'camps-arts' ? 'camps+and+arts' : category.replace('-', '+');
  return `https://s3-us-west-1.amazonaws.com/randombmir/${categoryUrl}/${filename}`;
}

async function loadAudioMetadata() {
  // Create a new database instance
  const database = fireproof('bmir-audio-player');
  const audioFilesDir = path.join(process.cwd(), 'audio_files');
  
  console.log('Scanning audio_files directory...');
  
  try {
    const files = fs.readdirSync(audioFilesDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));
    
    console.log(`Found ${mp3Files.length} MP3 files`);
    
    let loadedCount = 0;
    let skippedCount = 0;
    
    for (const mp3File of mp3Files) {
      const baseName = mp3File.replace('.mp3', '');
      const titleFile = `${baseName}.title`;
      const titleFilePath = path.join(audioFilesDir, titleFile);
      
      // Check if title file exists
      if (!fs.existsSync(titleFilePath)) {
        console.log(`Skipping ${mp3File} - no title file found`);
        skippedCount++;
        continue;
      }
      
      try {
        // Read and parse title file
        const titleContent = fs.readFileSync(titleFilePath, 'utf-8');
        const { title, transcriptPreview } = parseTitleFile(titleContent);
        
        if (!title) {
          console.log(`Skipping ${mp3File} - no title found in title file`);
          skippedCount++;
          continue;
        }
        
        // Determine category
        const category = determineCategory(mp3File);
        
        // Generate audio URL
        const audioUrl = generateAudioUrl(mp3File, category);
        
        // Create audio clip object
        const audioClip: Omit<AudioClip, '_id'> = {
          title,
          audioUrl,
          category,
          filename: mp3File,
          transcript: transcriptPreview, // Store just the preview, not full transcript
          createdAt: Date.now(),
        };
        
        // Check if clip already exists by querying the database
        const existingClips = await database.query('category', { 
          key: category,
          limit: 1000 
        });
        
        const exists = existingClips.docs.some((doc: any) => 
          doc.filename === mp3File
        );
        
        if (exists) {
          console.log(`Skipping ${mp3File} - already exists in database`);
          skippedCount++;
          continue;
        }
        
        // Save to database
        await database.put(audioClip);
        console.log(`Loaded: ${mp3File} - "${title}" (${category})`);
        loadedCount++;
        
      } catch (error) {
        console.error(`Error processing ${mp3File}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`\nLoad complete!`);
    console.log(`Loaded: ${loadedCount} clips`);
    console.log(`Skipped: ${skippedCount} clips`);
    console.log(`Total processed: ${loadedCount + skippedCount} clips`);
    
    // Verify total count
    const allClips = await database.query('category', { limit: 10000 });
    console.log(`Total clips in database: ${allClips.docs.length}`);
    
  } catch (error) {
    console.error('Error loading audio metadata:', error);
  }
}

// Run the loader
if (require.main === module) {
  loadAudioMetadata().catch(console.error);
}

export { loadAudioMetadata }; 