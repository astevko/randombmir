#!/usr/bin/env python3
"""
Audio Backup Download Script
Downloads all audio files from S3 URLs in HTML files to local disk for backup purposes.
"""

import hashlib
import os
import re
import time
from pathlib import Path
from typing import Dict, List
from urllib.parse import unquote

import requests

class AudioBackupDownloader:
    def __init__(self, backup_dir: str = "audio_backup"):
        """
        Initialize the backup downloader.
        
        Args:
            backup_dir: Directory to store downloaded audio files
        """
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        
        # Create subdirectories to match S3 structure
        self.categories = ['long+talks', 'random', 'camps+and+arts', 'warnings']
        for category in self.categories:
            (self.backup_dir / category).mkdir(exist_ok=True)
        
        # Track download statistics
        self.stats = {
            'total_files': 0,
            'downloaded': 0,
            'skipped': 0,
            'failed': 0,
            'total_size': 0
        }
        
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
    
    def get_file_info(self, url: str) -> Dict:
        """
        Get file information from URL.
        
        Args:
            url: Audio file URL
            
        Returns:
            Dictionary with file info
        """
        filename = unquote(url.split('/')[-1])
        category = url.split('/')[-2] if len(url.split('/')) > 1 else 'unknown'
        
        return {
            'url': url,
            'filename': filename,
            'category': category,
            'local_path': self.backup_dir / category / filename
        }
    
    def calculate_file_hash(self, file_path: Path) -> str:
        """
        Calculate MD5 hash of a file.
        
        Args:
            file_path: Path to file
            
        Returns:
            MD5 hash string
        """
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def download_file(self, file_info: Dict) -> bool:
        """
        Download a single audio file.
        
        Args:
            file_info: Dictionary with file information
            
        Returns:
            True if successful, False otherwise
        """
        url = file_info['url']
        filename = file_info['filename']
        local_path = file_info['local_path']
        
        # Check if file already exists
        if local_path.exists():
            file_size = local_path.stat().st_size
            print(f"✓ Skipped (exists): {filename} ({self.format_size(file_size)})")
            self.stats['skipped'] += 1
            self.stats['total_size'] += file_size
            return True
        
        print(f"⬇️  Downloading: {filename}")
        
        try:
            # Download with progress tracking
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # Get file size for progress tracking
            total_size = int(response.headers.get('content-length', 0))
            
            with open(local_path, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Show progress for large files
                        if total_size > 1024 * 1024:  # > 1MB
                            progress = (downloaded / total_size) * 100
                            print(f"\r  Progress: {progress:.1f}%", end='', flush=True)
            
            if total_size > 1024 * 1024:
                print()  # New line after progress
            
            # Verify download
            actual_size = local_path.stat().st_size
            if total_size > 0 and actual_size != total_size:
                print(f"⚠️  Warning: Size mismatch for {filename}")
                local_path.unlink()  # Delete incomplete file
                return False
            
            print(f"✓ Downloaded: {filename} ({self.format_size(actual_size)})")
            self.stats['downloaded'] += 1
            self.stats['total_size'] += actual_size
            return True
            
        except Exception as e:
            print(f"✗ Failed: {filename} - {e}")
            # Clean up partial download
            if local_path.exists():
                local_path.unlink()
            self.stats['failed'] += 1
            return False
    
    def format_size(self, size_bytes: int) -> str:
        """
        Format file size in human readable format.
        
        Args:
            size_bytes: Size in bytes
            
        Returns:
            Formatted size string
        """
        if size_bytes == 0:
            return "0B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f}{size_names[i]}"
    
    def process_html_files(self, html_files: List[str]):
        """
        Process multiple HTML files and download all audio files.
        
        Args:
            html_files: List of HTML file paths
        """
        print("🎵 Audio Backup Downloader")
        print("=" * 50)
        
        all_urls = set()
        
        # Extract URLs from all HTML files
        for html_file in html_files:
            if not os.path.exists(html_file):
                print(f"⚠️  Warning: {html_file} not found, skipping...")
                continue
            
            print(f"\n📄 Processing: {html_file}")
            urls = self.extract_audio_urls_from_html(html_file)
            all_urls.update(urls)
            print(f"   Found {len(urls)} audio URLs")
        
        # Convert to list and sort
        all_urls = sorted(list(all_urls))
        self.stats['total_files'] = len(all_urls)
        
        print(f"\n📊 Total unique audio files: {len(all_urls)}")
        print("=" * 50)
        
        # Download all files
        for i, url in enumerate(all_urls, 1):
            file_info = self.get_file_info(url)
            print(f"\n[{i}/{len(all_urls)}] ", end='')
            
            success = self.download_file(file_info)
            
            # Rate limiting to be nice to the server
            if success:
                time.sleep(0.1)  # 100ms delay between successful downloads
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print download summary statistics."""
        print("\n" + "=" * 50)
        print("📊 DOWNLOAD SUMMARY")
        print("=" * 50)
        print(f"Total files found: {self.stats['total_files']}")
        print(f"Successfully downloaded: {self.stats['downloaded']}")
        print(f"Skipped (already exists): {self.stats['skipped']}")
        print(f"Failed: {self.stats['failed']}")
        print(f"Total size: {self.format_size(self.stats['total_size'])}")
        print(f"Backup location: {self.backup_dir.absolute()}")
        
        if self.stats['failed'] > 0:
            print(f"\n⚠️  {self.stats['failed']} files failed to download.")
            print("   Check the error messages above and try again.")
        
        print(f"\n✅ Backup complete! Files saved to: {self.backup_dir.absolute()}")
    
    def create_manifest(self):
        """
        Create a manifest file with information about all downloaded files.
        """
        manifest_file = self.backup_dir / "backup_manifest.txt"
        
        with open(manifest_file, 'w', encoding='utf-8') as f:
            f.write("Audio Backup Manifest\n")
            f.write("=" * 50 + "\n")
            f.write(f"Created: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total files: {self.stats['total_files']}\n")
            f.write(f"Total size: {self.format_size(self.stats['total_size'])}\n\n")
            
            # List all files by category
            for category in self.categories:
                category_dir = self.backup_dir / category
                if category_dir.exists():
                    files = list(category_dir.glob("*.mp3"))
                    if files:
                        f.write(f"\n{category.upper()}:\n")
                        f.write("-" * 30 + "\n")
                        for file_path in sorted(files):
                            size = file_path.stat().st_size
                            f.write(f"{file_path.name} ({self.format_size(size)})\n")
        
        print(f"📋 Manifest created: {manifest_file}")

def main():
    """
    Main function to run the backup downloader.
    """
    # HTML files to process
    HTML_FILES = ['index.html', 'inc.html', 'inc2.html', 'inx3.html']
    
    # Initialize downloader
    downloader = AudioBackupDownloader()
    
    # Process all HTML files
    downloader.process_html_files(HTML_FILES)
    
    # Create manifest
    downloader.create_manifest()

if __name__ == "__main__":
    main() 