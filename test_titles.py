#!/usr/bin/env python3
"""
Test script to generate titles for a few audio files.
"""

import json
from src.randombmir_audio_tools.transcribe_audio_local import LocalAudioTranscriber

def test_title_generation():
    """Test title generation for a few files."""
    
    # Initialize transcriber
    transcriber = LocalAudioTranscriber()
    
    # Load existing transcriptions
    transcriber.load_existing_transcriptions()
    
    # Test with just 3 files
    test_files = [
        "01+secret.mp3",
        "02+horny.mp3", 
        "03+dodgeball.mp3"
    ]
    
    print("🧪 Testing title generation for 3 files...")
    print("=" * 50)
    
    for filename in test_files:
        if filename in transcriber.transcriptions:
            transcript = transcriber.transcriptions[filename]['transcript']
            
            # Generate title
            title = transcriber.generate_title_from_transcript(transcript, filename)
            
            # Store in transcriptions data
            transcriber.transcriptions[filename]['title'] = title
            
            print(f"📝 {filename}: {title}")
            print("-" * 30)
        else:
            print(f"⚠️  No transcription found for: {filename}")
    
    # Save to test JSON
    with open('test_transcriptions.json', 'w', encoding='utf-8') as f:
        json.dump(transcriber.transcriptions, f, indent=2, ensure_ascii=False)
    
    print("💾 Saved test results to test_transcriptions.json")
    print("✅ Test completed!")

if __name__ == "__main__":
    test_title_generation() 