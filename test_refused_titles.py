#!/usr/bin/env python3
"""
Test script to handle refused titles.
"""

import json
from src.randombmir_audio_tools.transcribe_audio_local import LocalAudioTranscriber

def test_refused_title_handling():
    """Test handling of refused titles."""
    
    # Initialize transcriber
    transcriber = LocalAudioTranscriber()
    
    # Load existing transcriptions
    transcriber.load_existing_transcriptions()
    
    # Test with the problematic file
    test_file = "02+horny.mp3"
    
    print("🧪 Testing refused title handling...")
    print("=" * 50)
    
    if test_file in transcriber.transcriptions:
        transcript = transcriber.transcriptions[test_file]['transcript']
        
        # Generate title (this should now save to file if refused)
        title = transcriber.generate_title_from_transcript(transcript, test_file)
        
        # Store in transcriptions data
        transcriber.transcriptions[test_file]['title'] = title
        
        print(f"📝 Final title: {title}")
        print("-" * 30)
        
        # Check if a .title file was created
        title_file = transcriber.output_dir / f"{test_file.replace('.mp3', '')}.title"
        if title_file.exists():
            print(f"📝 Title file created: {title_file}")
            print("💡 You can now edit this file manually and re-run the script")
        else:
            print("✅ Title generated successfully without refusal")
    
    # Save to test JSON
    with open('test_refused_titles.json', 'w', encoding='utf-8') as f:
        json.dump(transcriber.transcriptions, f, indent=2, ensure_ascii=False)
    
    print("💾 Saved test results to test_refused_titles.json")
    print("✅ Test completed!")

if __name__ == "__main__":
    test_refused_title_handling() 