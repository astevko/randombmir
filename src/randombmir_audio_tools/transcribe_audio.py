#!/usr/bin/env python3
"""
Audio Transcription Script
Transcribes audio files using OpenAI's Whisper API and generates descriptive titles.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import unquote

import openai
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AudioTranscriber:
    def __init__(self, api_key: str, output_dir: str = "audio_files"):
        """
        Initialize the audio transcriber.
        
        Args:
            api_key: OpenAI API key
            output_dir: Directory to store downloaded audio files
        """
        self.api_key = api_key
        self.client = openai.OpenAI(api_key=api_key)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Store transcriptions
        self.transcriptions = {}
        
        # HTML files to process
        self.html_files = ['index.html', 'inc.html', 'inc2.html', 'inx3.html']
    
    def validate_api_key(self) -> bool:
        """
        Validate the API key by making a simple test call.
        
        Returns:
            True if API key is valid, False otherwise
        """
        try:
            # Test with a simple chat completion
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return True
        except openai.AuthenticationError:
            print("❌ Authentication Error: Invalid API key")
            print("   Please check your .env file and ensure OPENAI_API_KEY is correct")
            return False
        except Exception as e:
            print(f"❌ API Key validation failed: {e}")
            return False
    
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
        Transcribe an audio file using OpenAI Whisper API.
        
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
            with open(audio_path, 'rb') as audio_file:
                response = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
                transcript = response
            
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
            
            # Rate limiting
            time.sleep(1)
            
            return transcript
            
        except openai.AuthenticationError as e:
            print(f"❌ Authentication Error for {filename}: Invalid API key")
            print(f"   Please check your .env file and ensure OPENAI_API_KEY is correct")
            return None
        except openai.RateLimitError as e:
            print(f"⚠️  Rate limit exceeded for {filename}. Waiting 60 seconds...")
            time.sleep(60)
            return None
        except openai.APIError as e:
            print(f"⚠️  API Error for {filename}: {e}")
            return None
        except Exception as e:
            print(f"✗ Failed to transcribe {filename}: {e}")
            return None
    
    def generate_title_from_transcript(self, transcript: str, filename: str) -> str:
        """
        Generate a descriptive title from transcript using GPT-3.5.
        
        Args:
            transcript: Audio transcription
            filename: Original filename
            
        Returns:
            Generated title
        """
        # Truncate transcript for API efficiency
        transcript_preview = transcript[:500] if len(transcript) > 500 else transcript
        
        prompt = f"""
        Create a catchy, descriptive title (max 50 characters) for this BMIR audio excerpt:
        
        Transcript: "{transcript_preview}"
        Original filename: {filename}
        
        Make it engaging and descriptive of the content. Avoid generic titles.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates engaging titles for audio content."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.7
            )
            
            title = response.choices[0].message.content.strip()
            
            # Clean up title
            title = title.replace('"', '').replace("'", "")
            if len(title) > 50:
                title = title[:47] + "..."
            
            return title
            
        except Exception as e:
            print(f"✗ Failed to generate title for {filename}: {e}")
            # Fallback to filename-based title
            return filename.replace('+', ' ').replace('.mp3', '')
    
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
            # Replace in data-audio attributes
            pattern = f'data-audio="{re.escape(url)}">[^<]+</li>'
            replacement = f'data-audio="{url}">{title}</li>'
            updated_content = re.sub(pattern, replacement, updated_content)
            
            # Replace in source tags
            pattern = f'<source src="{re.escape(url)}" type="audio/mpeg">'
            # Keep source tags as they are, just update the text content
        
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
    
    def run_complete_workflow(self):
        """
        Run the complete transcription workflow on all HTML files.
        """
        print("🎵 Audio Transcription Workflow")
        print("=" * 50)
        
        for html_file in self.html_files:
            if os.path.exists(html_file):
                url_to_title = self.process_html_file(html_file)
                self.update_html_file(html_file, url_to_title)
            else:
                print(f"⚠️  File not found: {html_file}")
        
        # Save transcriptions
        self.save_transcriptions()
        
        print("\n🎉 Workflow completed!")
        print(f"📊 Processed {len(self.transcriptions)} audio files")


def main():
    """Main function to run the transcription workflow."""
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        print("   Please create a .env file with: OPENAI_API_KEY=your-api-key-here")
        return
    
    # Initialize transcriber
    transcriber = AudioTranscriber(api_key)
    
    # Validate API key before starting
    print("🔑 Validating API key...")
    if not transcriber.validate_api_key():
        print("❌ Cannot proceed with invalid API key {api_key}")
        return
    
    print("✅ API key validated successfully!")
    
    # Run workflow
    transcriber.run_complete_workflow()


if __name__ == "__main__":
    main() 