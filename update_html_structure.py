#!/usr/bin/env python3
"""
Script to update HTML structure for multi-column flexbox layout.
"""

import re

def update_html_structure():
    """Update the HTML to use new CSS classes for flexbox layout."""
    
    # Read the current HTML
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add CSS link to head
    if 'style.css' not in content:
        content = content.replace(
            '<link href="https://fonts.googleapis.com/css?family=Roboto+Condensed:400,700" rel="stylesheet">',
            '<link href="https://fonts.googleapis.com/css?family=Roboto+Condensed:400,700" rel="stylesheet">\n  <link href="style.css" rel="stylesheet">'
        )
    
    # Remove inline body styles since they're now in CSS
    content = re.sub(
        r'<body[^>]*style="[^"]*"[^>]*>',
        '<body>',
        content
    )
    
    # Update main title
    content = re.sub(
        r'<span style="font-size:3em;line-height:80%; font-weight:bold;">\s*bmir<br>\s*random<br />\s*audio<br />\s*excerpts<br />\s*</span>',
        '<div class="main-title">bmir<br>random<br />audio<br />excerpts<br /></div>',
        content
    )
    
    # Function to convert a section of audio spans to flexbox structure
    def convert_section_to_flexbox(section_content, section_title):
        # Find all audio spans in this section
        audio_spans = re.findall(r'<span[^>]*>([^<]*)<audio[^>]*>.*?</audio>[^<]*</span>', section_content, re.DOTALL)
        
        if not audio_spans:
            return section_content
        
        # Create new flexbox structure
        new_structure = f'<h2 class="section-header">{section_title}</h2>\n<div class="audio-container">\n'
        
        # Extract audio elements and their titles
        audio_elements = re.findall(r'<span[^>]*>([^<]*)<audio([^>]*)>.*?</audio>[^<]*</span>', section_content, re.DOTALL)
        
        for title, audio_attrs in audio_elements:
            # Clean up title
            clean_title = title.strip()
            if clean_title.startswith('0') and '.' in clean_title:
                clean_title = clean_title.split('.', 1)[1].strip()
            
            # Extract audio source
            source_match = re.search(r'src="([^"]+)"', audio_attrs)
            if source_match:
                audio_src = source_match.group(1)
                new_structure += f'''    <div class="audio-item">
        <div class="audio-title">{clean_title}</div>
        <div class="audio-controls">
            <audio controls preload="none">
                <source src="{audio_src}" type="audio/mpeg">
                Your browser may not support the audio thingy. Try another browser.
            </audio>
        </div>
    </div>\n'''
        
        new_structure += '</div>'
        return new_structure
    
    # Convert each section
    sections = [
        ('Longer talks:', 'Longer talks'),
        ('Random uncategorized stuff:', 'Random uncategorized stuff'),
        ('Camps and Arts announcements:', 'Camps and Arts announcements'),
        ('Warnings:', 'Warnings')
    ]
    
    for old_title, new_title in sections:
        # Find the section
        section_pattern = rf'<p[^>]*>{re.escape(old_title)}</p>\s*<p>\s*(.*?)(?=<p[^>]*>.*?:</p>|$)'
        section_match = re.search(section_pattern, content, re.DOTALL)
        
        if section_match:
            section_content = section_match.group(0)
            new_section = convert_section_to_flexbox(section_content, new_title)
            content = content.replace(section_content, new_section)
    
    # Write updated HTML
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ HTML structure updated for multi-column flexbox layout!")
    print("📝 Added CSS link and converted audio sections to flexbox containers")

if __name__ == "__main__":
    update_html_structure() 