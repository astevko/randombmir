#!/usr/bin/env python3
"""
Script to help edit title files that need human input.
"""

import os
from pathlib import Path

def find_title_files():
    """Find all .title files that need editing."""
    
    audio_dir = Path("audio_files")
    title_files = list(audio_dir.glob("*.title"))
    
    if not title_files:
        print("✅ No title files found that need editing!")
        return
    
    print(f"📝 Found {len(title_files)} title files that need editing:")
    print("=" * 50)
    
    for i, title_file in enumerate(title_files, 1):
        print(f"{i}. {title_file.name}")
        
        # Show current content
        try:
            with open(title_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                # Find the current title
                current_title = None
                for line in lines:
                    if line.strip() and not line.startswith('#') and not line.startswith('['):
                        current_title = line.strip()
                        break
                
                if current_title:
                    print(f"   Current: {current_title}")
                else:
                    print("   Status: Needs editing")
                    
        except Exception as e:
            print(f"   Error reading file: {e}")
        
        print()
    
    print("💡 To edit a title file:")
    print("   1. Open the .title file in your editor")
    print("   2. Replace '[Enter your title here]' with your title")
    print("   3. Save the file")
    print("   4. Re-run the main script to apply changes")

if __name__ == "__main__":
    find_title_files() 