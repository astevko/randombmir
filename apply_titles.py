#!/usr/bin/env python3
"""
Quick script to apply existing titles from JSON to HTML without regenerating.
"""

import json
import re
import os
from urllib.parse import unquote

def apply_existing_titles():
    """Apply titles from JSON to HTML file."""
    
    # Load transcriptions JSON
    with open('transcriptions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Create URL to title mapping
    url_to_title = {}
    for filename, info in data.items():
        # Extract URL from audio_path or construct it
        audio_path = info.get('audio_path', '')
        if audio_path:
            # Extract filename and construct S3 URL
            filename_only = os.path.basename(audio_path)
            # Determine category from filename pattern
            if filename_only.startswith('01+') or filename_only.startswith('02+'):
                category = 'long+talks'
            elif filename_only.startswith('01+') or filename_only.startswith('02+'):
                category = 'random'
            else:
                category = 'random'  # default
            
            s3_url = f"https://s3-us-west-1.amazonaws.com/randombmir/{category}/{filename_only}"
            url_to_title[s3_url] = filename_only.replace('+', ' ').replace('.mp3', '').title()
    
    print(f"📊 Found {len(url_to_title)} titles to apply")
    
    # Read HTML file
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create backup
    if not os.path.exists('index.html.backup'):
        with open('index.html.backup', 'w', encoding='utf-8') as f:
            f.write(content)
        print("💾 Created backup: index.html.backup")
    
    # Apply titles
    updated_content = content
    applied_count = 0
    
    for url, title in url_to_title.items():
        # Handle audio tags with source elements
        pattern = f'<span style="white-space: nowrap;">(\\d+)<audio controls preload="none"><source src="{re.escape(url)}" type="audio/mpeg">'
        replacement = f'<span style="white-space: nowrap;">\\1. {title}<audio controls preload="none"><source src="{url}" type="audio/mpeg">'
        
        if re.search(pattern, updated_content):
            updated_content = re.sub(pattern, replacement, updated_content)
            applied_count += 1
            print(f"✅ Applied: {title}")
    
    # Write updated content
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"🎉 Applied {applied_count} titles to index.html")

if __name__ == "__main__":
    apply_existing_titles() 