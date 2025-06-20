#!/usr/bin/env python3
"""
Local Audio Transcription Script
Transcribes audio files using Faster-Whisper and generates titles using Ollama.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import unquote

import requests
from dotenv import load_dotenv
from faster_whisper import WhisperModel
import ollama

# Load environment variables from .env file
load_dotenv()


class LocalAudioTranscriber:
    def __init__(self, output_dir: str = "audio_files", model_size: str = "base"):
        """
        Initialize the local audio transcriber.
        
        Args:
            output_dir: Directory to store downloaded audio files
            model_size: Whisper model size (tiny, base, small, medium, large)
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize Whisper model
        print(f"🤖 Loading Whisper model: {model_size}")
        self.whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("✅ Whisper model loaded successfully!")
        
        # Store transcriptions
        self.transcriptions = {}
        
        # HTML files to process
        self.html_files = ['index.html', 'inc.html', 'inc2.html', 'inx3.html']
    
    def extract_audio_urls_from_html(self, html_file: str) -> List[str]:
        """
        Extract all audio URLs from an HTML file.
        
        Args:
            html_file: Path to HTML file
            
        Returns:
            List of audio URLs
        """
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all audio URLs (both in source tags and data-audio attributes)
        audio_patterns = [
            r'src="(https://s3-us-west-1\.amazonaws\.com/randombmir/[^"]+\.mp3)"',
            r'data-audio="(https://s3-us-west-1\.amazonaws\.com/randombmir/[^"]+\.mp3)"'
        ]
        
        urls = set()
        for pattern in audio_patterns:
            matches = re.findall(pattern, content)
            urls.update(matches)
        
        return sorted(list(urls))
    
    def download_audio_file(self, url: str) -> Optional[Path]:
        """
        Download an audio file from URL.
        
        Args:
            url: Audio file URL
            
        Returns:
            Path to downloaded file or None if failed
        """
        filename = unquote(url.split('/')[-1])
        local_path = self.output_dir / filename
        
        # Skip if already downloaded
        if local_path.exists():
            print(f"✓ Already exists: {filename}")
            return local_path
        
        print(f"⬇️  Downloading: {filename}")
        
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            print(f"✓ Downloaded: {filename}")
            return local_path
            
        except Exception as e:
            print(f"✗ Failed to download {filename}: {e}")
            return None
    
    def transcribe_audio(self, audio_path: Path) -> Optional[str]:
        """
        Transcribe an audio file using Faster-Whisper.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcription text or None if failed
        """
        filename = audio_path.name
        transcript_filename = filename.replace('.mp3', '.txt')
        transcript_path = self.output_dir / transcript_filename
        
        # Check if already transcribed
        if filename in self.transcriptions:
            print(f"✓ Already transcribed: {filename}")
            return self.transcriptions[filename]['transcript']
        
        print(f"🎤 Transcribing: {filename}")
        
        try:
            # Transcribe using Faster-Whisper
            segments, info = self.whisper_model.transcribe(
                str(audio_path),
                beam_size=5,
                language="en"
            )
            
            # Combine all segments into one transcript
            transcript = " ".join([segment.text for segment in segments])
            
            # Save individual transcription file
            with open(transcript_path, 'w', encoding='utf-8') as f:
                f.write(transcript)
            
            # Store transcription in memory
            self.transcriptions[filename] = {
                'transcript': transcript,
                'audio_path': str(audio_path),
                'transcript_path': str(transcript_path)
            }
            
            print(f"✓ Transcribed: {filename}")
            print(f"📄 Saved transcript: {transcript_filename}")
            
            return transcript
            
        except Exception as e:
            print(f"✗ Failed to transcribe {filename}: {e}")
            return None
    
    def generate_title_from_transcript(self, transcript: str, filename: str) -> str:
        """
        Generate a descriptive title from transcript using Ollama LLM.
        
        Args:
            transcript: Audio transcription
            filename: Original filename
            
        Returns:
            Generated title
        """
        # First check if there's a human-edited title
        human_titles = self.load_human_titles()
        if filename in human_titles:
            print(f"✅ Using human-edited title for {filename}")
            # Always save the .title file for review
            self.save_title_to_file(filename, human_titles[filename], transcript)
            return human_titles[filename]
        
        # Truncate transcript for API efficiency
        transcript_preview = transcript[:500] if len(transcript) > 500 else transcript
        
        prompt = f"""
        Create a catchy, descriptive title (max 50 characters) for this BMIR audio excerpt.
        Focus on the main topic, theme, or memorable moment from the audio.
        Make it engaging and descriptive of the content. Avoid generic titles.
        
        Transcript: "{transcript_preview}"
        Original filename: {filename}
        
        Return only the title, nothing else.
        """
        
        # Try different models in order of preference
        models_to_try = [
            "llama3.2:3b",
            "llama3.1:8b", 
            "mistral:7b",
            "codellama:7b"
        ]
        
        for model in models_to_try:
            try:
                print(f"🤖 Trying model: {model}")
                
                response = requests.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    title = result['response'].strip()
                    
                    # Check if the model refused to generate content
                    if any(phrase in title.lower() for phrase in [
                        "i can not", "i cannot", "i'm unable", "i am unable", 
                        "i'm sorry", "i am sorry", "i cannot create",
                        "i can not create", "i'm not able", "i am not able"
                    ]):
                        print(f"⚠️  Model {model} refused to generate title")
                        continue
                    
                    # Clean up title
                    title = title.replace('"', '').replace("'", "")
                    if len(title) > 50:
                        title = title[:47] + "..."
                    
                    print(f"✅ Generated title with {model}: {title}")
                    # Always save the .title file for review
                    self.save_title_to_file(filename, title, transcript)
                    return title
                    
            except Exception as e:
                print(f"⚠️  Failed with model {model}: {e}")
                continue
        
        # If all models fail, use first sentence from transcript as fallback
        print(f"⚠️  All models failed for {filename}, using first sentence as title")
        
        # Extract first sentence from transcript
        first_sentence = self.extract_first_sentence(transcript)
        
        # Always save the .title file for review
        self.save_title_to_file(filename, first_sentence, transcript)
        
        return first_sentence
    
    def extract_first_sentence(self, transcript: str) -> str:
        """
        Extract the first sentence from transcript and clean it up.
        
        Args:
            transcript: Full transcript text
            
        Returns:
            First sentence, cleaned and truncated
        """
        # Find the first sentence (ending with . ! ?)
        import re
        
        # Split on sentence endings
        sentences = re.split(r'[.!?]+', transcript.strip())
        first_sentence = sentences[0].strip() if sentences else transcript.strip()
        
        # Clean up the sentence
        first_sentence = first_sentence.replace('\n', ' ').replace('  ', ' ')
        
        # Truncate if too long
        if len(first_sentence) > 50:
            first_sentence = first_sentence[:47] + "..."
        
        return first_sentence
    
    def save_title_to_file(self, filename: str, title: str, transcript: str):
        """
        Save a title to a .title file for potential human editing.
        
        Args:
            filename: Audio filename
            title: Generated title
            transcript: Audio transcript
        """
        title_file = self.output_dir / f"{filename.replace('.mp3', '')}.title"
        
        content = f"""# Title for {filename}

## Current Title (from first sentence):
{title}

## Transcript Preview:
{transcript[:300]}...

## Instructions:
- The title above was generated from the first sentence of the transcript
- You can edit it to make it more engaging or descriptive
- Keep it under 50 characters
- Replace the title above with your improved version if desired

## Your Title:
{title}
"""
        
        with open(title_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"📝 Saved title file: {title_file.name}")
    
    def process_html_file(self, html_file: str) -> Dict[str, str]:
        """
        Process a single HTML file: download, transcribe, and generate titles.
        
        Args:
            html_file: Path to HTML file
            
        Returns:
            Dictionary mapping URLs to generated titles
        """
        print(f"\n📄 Processing: {html_file}")
        print("=" * 50)
        
        urls = self.extract_audio_urls_from_html(html_file)
        url_to_title = {}
        
        for url in urls:
            # Download audio
            audio_path = self.download_audio_file(url)
            if not audio_path:
                continue
            
            # Transcribe audio
            transcript = self.transcribe_audio(audio_path)
            if not transcript:
                continue
            
            # Generate title
            title = self.generate_title_from_transcript(transcript, audio_path.name)
            url_to_title[url] = title
            
            print(f"📝 Title: {title}")
            print("-" * 30)
        
        return url_to_title
    
    def update_html_file(self, html_file: str, url_to_title: Dict[str, str]):
        """
        Update HTML file with new titles.
        
        Args:
            html_file: Path to HTML file
            url_to_title: Dictionary mapping URLs to titles
        """
        # Create backup
        backup_file = f"{html_file}.backup"
        if not os.path.exists(backup_file):
            with open(html_file, 'r', encoding='utf-8') as src:
                with open(backup_file, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
            print(f"💾 Created backup: {backup_file}")
        
        # Read original content
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace titles
        updated_content = content
        for url, title in url_to_title.items():
            # Handle audio tags with source elements
            # Pattern: <span style="white-space: nowrap;">01<audio controls preload="none"><source src="URL" type="audio/mpeg">
            pattern = f'<span style="white-space: nowrap;">(\\d+)<audio controls preload="none"><source src="{re.escape(url)}" type="audio/mpeg">'
            replacement = f'<span style="white-space: nowrap;">\\1. {title}<audio controls preload="none"><source src="{url}" type="audio/mpeg">'
            updated_content = re.sub(pattern, replacement, updated_content)
            
            # Also handle data-audio attributes if they exist
            pattern = f'data-audio="{re.escape(url)}">[^<]+</li>'
            replacement = f'data-audio="{url}">{title}</li>'
            updated_content = re.sub(pattern, replacement, updated_content)
        
        # Write updated content
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"✅ Updated: {html_file}")
    
    def save_transcriptions(self, output_file: str = "transcriptions.json"):
        """
        Save all transcriptions to JSON file and report on individual files.
        
        Args:
            output_file: Output JSON file path
        """
        # Add titles to the transcriptions data
        for filename, info in self.transcriptions.items():
            # Generate title if not already present
            if 'title' not in info:
                title = self.generate_title_from_transcript(info['transcript'], filename)
                info['title'] = title
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.transcriptions, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved transcriptions summary: {output_file}")
        print(f"📁 Individual transcript files saved in: {self.output_dir}")
        print(f"📊 Total transcriptions: {len(self.transcriptions)}")
        
        # List all transcript files
        transcript_files = list(self.output_dir.glob("*.txt"))
        if transcript_files:
            print("📄 Transcript files created:")
            for file in sorted(transcript_files):
                print(f"   - {file.name}")
    
    def load_existing_transcriptions(self):
        """
        Load existing transcriptions from .txt files in the output directory.
        """
        print("📂 Loading existing transcriptions...")
        
        transcript_files = list(self.output_dir.glob("*.txt"))
        for transcript_file in transcript_files:
            # Get corresponding audio filename
            audio_filename = transcript_file.name.replace('.txt', '.mp3')
            audio_path = self.output_dir / audio_filename
            
            if audio_path.exists():
                with open(transcript_file, 'r', encoding='utf-8') as f:
                    transcript = f.read().strip()
                
                self.transcriptions[audio_filename] = {
                    'transcript': transcript,
                    'audio_path': str(audio_path),
                    'transcript_path': str(transcript_file)
                }
                print(f"✓ Loaded: {audio_filename}")
        
        print(f"📊 Loaded {len(self.transcriptions)} existing transcriptions")
    
    def run_titles_only_workflow(self):
        """
        Run only the title generation and HTML update workflow.
        """
        print("🎵 Title Generation and HTML Update Workflow")
        print("=" * 50)
        
        # Load existing transcriptions
        self.load_existing_transcriptions()
        
        if not self.transcriptions:
            print("❌ No transcriptions found. Please run transcription first.")
            return
        
        # Only process the first HTML file to avoid duplicates
        html_file = self.html_files[0]  # index.html
        
        if os.path.exists(html_file):
            print(f"📄 Processing: {html_file} (skipping others to avoid duplicates)")
            url_to_title = self.process_html_file_titles_only(html_file)
            self.update_html_file(html_file, url_to_title)
        else:
            print(f"⚠️  File not found: {html_file}")
        
        # Save transcriptions
        self.save_transcriptions()
        
        print("\n🎉 Title generation completed!")
        print(f"📊 Generated titles for {len(url_to_title)} audio files")
    
    def process_html_file_titles_only(self, html_file: str) -> Dict[str, str]:
        """
        Process a single HTML file: generate titles only (no download/transcription).
        
        Args:
            html_file: Path to HTML file
            
        Returns:
            Dictionary mapping URLs to generated titles
        """
        print(f"\n📄 Processing titles for: {html_file}")
        print("=" * 50)
        
        urls = self.extract_audio_urls_from_html(html_file)
        url_to_title = {}
        
        for url in urls:
            # Get filename from URL
            filename = unquote(url.split('/')[-1])
            
            # Check if we have a transcription for this file
            if filename in self.transcriptions:
                transcript = self.transcriptions[filename]['transcript']
                
                # Generate title
                title = self.generate_title_from_transcript(transcript, filename)
                url_to_title[url] = title
                
                # Store title in transcriptions data
                self.transcriptions[filename]['title'] = title
                
                print(f"📝 Title: {title}")
                print("-" * 30)
            else:
                print(f"⚠️  No transcription found for: {filename}")
        
        return url_to_title
    
    def run_complete_workflow(self):
        """
        Run the complete transcription workflow on the first HTML file only.
        """
        print("🎵 Local Audio Transcription Workflow")
        print("=" * 50)
        
        # Only process the first HTML file to avoid duplicates
        html_file = self.html_files[0]  # index.html
        
        if os.path.exists(html_file):
            print(f"📄 Processing: {html_file} (skipping others to avoid duplicates)")
            url_to_title = self.process_html_file(html_file)
            self.update_html_file(html_file, url_to_title)
        else:
            print(f"⚠️  File not found: {html_file}")
        
        # Save transcriptions
        self.save_transcriptions()
        
        print("\n🎉 Workflow completed!")
        print(f"📊 Processed {len(self.transcriptions)} audio files")
        print("💡 Note: Only processed index.html to avoid duplicate audio files")
    
    def load_human_titles(self):
        """
        Load human-edited titles from .title files.
        
        Returns:
            Dictionary mapping filenames to human titles
        """
        human_titles = {}
        title_files = list(self.output_dir.glob("*.title"))
        
        for title_file in title_files:
            try:
                with open(title_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract the title from the file
                lines = content.split('\n')
                for line in lines:
                    if line.strip() and not line.startswith('#') and not line.startswith('['):
                        # This should be the human title
                        title = line.strip()
                        if title and len(title) > 0:
                            # Convert back to mp3 filename
                            mp3_filename = title_file.name.replace('.title', '.mp3')
                            human_titles[mp3_filename] = title
                            print(f"📝 Loaded human title for {mp3_filename}: {title}")
                            break
                            
            except Exception as e:
                print(f"⚠️  Error loading {title_file}: {e}")
        
        return human_titles


def main():
    """Main function to run the local transcription workflow."""
    parser = argparse.ArgumentParser(description='Local Audio Transcription Tool')
    parser.add_argument('--titles-only', action='store_true', 
                       help='Skip download and transcription, only generate titles')
    parser.add_argument('--full', action='store_true', 
                       help='Run full workflow (download, transcribe, generate titles)')
    
    args = parser.parse_args()
    
    # Initialize transcriber
    transcriber = LocalAudioTranscriber()
    
    if args.titles_only:
        # Run titles-only workflow
        transcriber.run_titles_only_workflow()
    elif args.full:
        # Run full workflow (download, transcribe, generate titles)
        transcriber.run_complete_workflow()
    else:
        # Default: titles-only workflow
        print("🎯 Running titles-only workflow (use --full for complete workflow)")
        transcriber.run_titles_only_workflow()


if __name__ == "__main__":
    main() 