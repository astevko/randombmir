import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { filename, content, title } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Ensure the filename ends with .txt
    const txtFilename = filename.endsWith('.txt') ? filename : `${filename.replace('.mp3', '')}.txt`;
    
    // Path to the audio_files directory (relative to project root)
    const filePath = join(process.cwd(), 'public', 'audio_files', txtFilename);
    
    // Write the content to the file
    if (content !== undefined) {
      await writeFile(filePath, content, 'utf8');
    }
    
    // Update transcriptions.json if title is provided
    if (title !== undefined) {
      const transcriptionsPath = join(process.cwd(), 'transcriptions.json');
      try {
        const transcriptionsData = JSON.parse(await readFile(transcriptionsPath, 'utf8'));
        
        if (transcriptionsData[filename]) {
          transcriptionsData[filename].title = title;
          await writeFile(transcriptionsPath, JSON.stringify(transcriptionsData, null, 2), 'utf8');
        }
      } catch (error) {
        console.error('Error updating transcriptions.json:', error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `File updated successfully` 
    });
    
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename parameter is required' },
        { status: 400 }
      );
    }

    // Ensure the filename ends with .txt
    const txtFilename = filename.endsWith('.txt') ? filename : `${filename.replace('.mp3', '')}.txt`;
    
    // Path to the audio_files directory
    const filePath = join(process.cwd(), 'public', 'audio_files', txtFilename);
    
    // Read the file content
    const content = await readFile(filePath, 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      content,
      filename: txtFilename
    });
    
  } catch (error) {
    console.error('Error reading transcript:', error);
    return NextResponse.json(
      { error: 'Failed to read transcript' },
      { status: 500 }
    );
  }
} 