# Audio Backup Download Script

A simple and efficient script to download all audio files from your HTML pages to local disk for backup purposes.

## Features

- **Automatic Discovery**: Finds all audio URLs from your HTML files
- **Organized Storage**: Maintains S3 folder structure locally
- **Progress Tracking**: Shows download progress and statistics
- **Resume Support**: Skips already downloaded files
- **Error Handling**: Graceful handling of network issues
- **Manifest Creation**: Generates a detailed backup manifest
- **Size Verification**: Ensures complete downloads

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install requests
   ```

2. **Run the backup**:
   ```bash
   python download_backup.py
   ```

## What It Does

The script will:

1. **Scan HTML files**: `index.html`, `inc.html`, `inc2.html`, `inx3.html`
2. **Extract URLs**: Find all S3 audio URLs
3. **Create folders**: Organize files by category:
   - `long+talks/`
   - `random/`
   - `camps+and+arts/`
   - `warnings/`
4. **Download files**: Download all MP3 files with progress tracking
5. **Create manifest**: Generate a backup manifest with file details

## Output Structure

```
audio_backup/
├── long+talks/
│   ├── 01+trans.mp3
│   ├── 02+potty+appocalipse.mp3
│   └── ...
├── random/
│   ├── 01+chiptune.mp3
│   ├── 02+butt.mp3
│   └── ...
├── camps+and+arts/
│   ├── 01+secret.mp3
│   └── ...
├── warnings/
│   ├── 01+boundaries.mp3
│   └── ...
└── backup_manifest.txt
```

## Example Output

```
🎵 Audio Backup Downloader
==================================================

📄 Processing: index.html
   Found 150 audio URLs

📄 Processing: inc.html
   Found 150 audio URLs

📊 Total unique audio files: 150
==================================================

[1/150] ⬇️  Downloading: 01+trans.mp3
  Progress: 100.0%
✓ Downloaded: 01+trans.mp3 (2.3MB)

[2/150] ✓ Skipped (exists): 02+potty+appocalipse.mp3 (1.8MB)

...

==================================================
📊 DOWNLOAD SUMMARY
==================================================
Total files found: 150
Successfully downloaded: 45
Skipped (already exists): 105
Failed: 0
Total size: 245.7MB
Backup location: /path/to/audio_backup

✅ Backup complete! Files saved to: /path/to/audio_backup
📋 Manifest created: /path/to/audio_backup/backup_manifest.txt
```

## Customization

### Change Backup Directory

```python
downloader = AudioBackupDownloader(backup_dir="my_audio_backup")
```

### Process Specific Files

```python
HTML_FILES = ['index.html']  # Only backup from index.html
```

### Adjust Download Speed

```python
# In download_file method, change the sleep time:
time.sleep(0.1)  # 100ms delay between downloads
```

## Manifest File

The script creates a `backup_manifest.txt` file with:

- Creation timestamp
- Total file count and size
- Organized list of all files by category
- Individual file sizes

Example manifest:
```
Audio Backup Manifest
==================================================
Created: 2024-01-15 14:30:25
Total files: 150
Total size: 245.7MB

LONG+TALKS:
------------------------------
01+trans.mp3 (2.3MB)
02+potty+appocalipse.mp3 (1.8MB)
...

RANDOM:
------------------------------
01+chiptune.mp3 (0.9MB)
02+butt.mp3 (1.2MB)
...
```

## Benefits

- **Offline Access**: All audio files available locally
- **Backup Security**: Protect against S3 service issues
- **Fast Access**: No network delays when playing locally
- **Organization**: Maintains original folder structure
- **Verification**: Complete download verification
- **Resume Capability**: Can restart interrupted downloads

## Troubleshooting

### Network Issues
```
✗ Failed: filename.mp3 - Connection timeout
```
- Check your internet connection
- Try running the script again (it will skip completed downloads)

### Permission Errors
```
✗ Failed: filename.mp3 - Permission denied
```
- Ensure you have write permissions to the backup directory
- Try running with different permissions

### Disk Space
- Monitor available disk space before running
- Estimated size: ~250MB for all files

## Integration with Transcription

This backup script works perfectly with the transcription workflow:

1. **First**: Run `download_backup.py` to get local copies
2. **Then**: Run `transcribe_audio.py` using local files (faster)

The transcription script can be modified to use local files instead of downloading again.

## Notes

- Files are organized by category to match S3 structure
- Duplicate URLs across HTML files are handled automatically
- Progress tracking shows download percentage for large files
- Rate limiting prevents overwhelming the S3 server
- All downloads are verified for completeness 