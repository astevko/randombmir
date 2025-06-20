# Local Audio Transcription Workflow

This project provides a complete local workflow to transcribe audio files from your HTML pages and update them with descriptive titles using local AI models.

## Overview

The workflow consists of:

1. **Audio Download**: Downloads MP3 files from S3 URLs in your HTML files
2. **Local Transcription**: Uses Faster-Whisper to transcribe audio content locally
3. **Local Title Generation**: Uses Ollama with Llama models to create descriptive titles
4. **HTML Update**: Updates your HTML files with the new titles

## Prerequisites

1. **Python 3.8+**: The script requires Python 3.8 or higher

2. **Ollama**: Install Ollama for local LLM inference

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

3. **Ollama Model**: Pull a language model

```bash
ollama pull llama3.2:3b
```

4. **Dependencies**: Install required packages:

```bash
uv sync
```

## Setup

1. **Install Ollama**:

   - Follow the installation guide at [Ollama.ai](https://ollama.ai/)
   - Pull a model: `ollama pull llama3.2:3b`

2. **Install Dependencies**:

```bash
uv sync
```

## Usage

### Titles Only (Recommended - Skip Download/Transcription)

If you already have audio files and transcriptions:

```bash
python src/randombmir_audio_tools/transcribe_audio_local.py --titles-only
```

This will:

- Load existing transcriptions from `audio_files/*.txt`
- Generate descriptive titles using Ollama
- Update HTML files with new titles
- Save updated transcriptions to `transcriptions.json`

### Full Workflow (Download, Transcribe, Generate Titles)

For complete processing from scratch:

```bash
python src/randombmir_audio_tools/transcribe_audio_local.py --full
```

This will:

- Process `index.html` (skips other files to avoid duplicates)
- Download audio files to `audio_files/` directory
- Transcribe each audio file using Faster-Whisper
- Generate descriptive titles using Ollama
- Update HTML files with new titles
- Create backup files (`.backup` extension)
- Save all transcriptions to `transcriptions.json`

### Default Mode

```bash
python src/randombmir_audio_tools/transcribe_audio_local.py
```

Runs titles-only workflow by default.

## Step-by-Step Process

1. **Extract URLs**: The script finds all S3 audio URLs in your HTML files
2. **Download Audio**: Downloads MP3 files locally (skips if already downloaded)
3. **Transcribe**: Uses Faster-Whisper to convert speech to text locally
4. **Generate Titles**: Uses Ollama with Llama models to create concise, descriptive titles
5. **Update HTML**: Replaces filename-based titles with content-based titles

## Output Files

- `audio_files/`: Directory containing downloaded MP3 files
- `audio_files/*.txt`: Individual transcript files (one per audio file)
- `transcriptions.json`: All transcriptions saved for reference
- `*.html.backup`: Backup of original HTML files
- Updated HTML files with new titles

## Cost

**FREE!** 🎉

- **Faster-Whisper**: Runs locally, no API costs
- **Ollama**: Runs locally, no API costs
- **Total cost**: $0.00

## Local Models Used

### Transcription: Faster-Whisper

- **Model**: Whisper base (145MB)
- **Accuracy**: High quality transcription
- **Speed**: Fast local processing
- **Languages**: English (configurable)

### Title Generation: Ollama + Llama

- **Model**: llama3.2:3b (2GB)
- **Quality**: Creative, engaging titles
- **Speed**: Fast local inference
- **Fallback**: Handles refusal cases gracefully

## Customization

### Change Whisper Model Size

Edit the model size in the script:

```python
transcriber = LocalAudioTranscriber(model_size="small")  # tiny, base, small, medium, large
```

### Change Ollama Model

Edit the model in `generate_title_from_transcript()`:

```python
response = ollama.chat(
    model='llama3.2:3b',  # Change to any model you have
    messages=[...]
)
```

### Process Specific Files

Modify the `HTML_FILES` list in the class:

```python
self.html_files = ['index.html']  # Only process index.html
```

### Change Output Directory

```python
transcriber = LocalAudioTranscriber(output_dir="my_audio_files")
```

## Troubleshooting

### Common Issues

1. **Ollama Not Running**:

```ini
Error: Connection refused
```

Solution: Start Ollama: `ollama serve`

2. **Model Not Found**:

```sh
Error: Model not found
```

Solution: Pull the model: `ollama pull llama3.2:3b`

3. **Whisper Model Download**:

```sh
Downloading model files...
```

Solution: First run downloads the model (145MB), subsequent runs are faster

4. **Large File Processing**:

```sh
Taking a long time on large files
```

Solution: Large files (10MB+) can take 10-30 minutes. Be patient!

### Performance Tips

- **Use GPU**: If available, Faster-Whisper can use GPU acceleration
- **Smaller Models**: Use "tiny" or "base" for faster processing
- **Batch Processing**: Process files in smaller batches

## Manual Workflow (Alternative)

If you prefer to process files manually:

```python
from transcribe_audio_local import LocalAudioTranscriber

# Initialize
transcriber = LocalAudioTranscriber()

# Load existing transcriptions
transcriber.load_existing_transcriptions()

# Generate titles only
url_to_title = transcriber.process_html_file_titles_only("index.html")
transcriber.update_html_file("index.html", url_to_title)

# Save transcriptions
transcriber.save_transcriptions("my_transcriptions.json")
```

## File Structure After Processing

```ini
your-project/
├── index.html (updated with new titles)
├── audio_files/
│   ├── 01+trans.mp3
│   ├── 01+trans.txt
│   ├── 02+potty+appocalipse.mp3
│   ├── 02+potty+appocalipse.txt
│   └── ...
├── transcriptions.json
├── transcribe_audio_local.py
├── pyproject.toml
└── README_transcription.md
```

## Example Output

**Before**:

```html
<li data-audio="https://s3-us-west-1.amazonaws.com/randombmir/long+talks/01+trans.mp3">long+talks/01+trans.mp3</li>
```

**After**:

```html
<li data-audio="https://s3-us-west-1.amazonaws.com/randombmir/long+talks/01+trans.mp3">Transgender Rights Discussion</li>
```

## Advantages of Local Processing

- 🆓 **Completely Free**: No API costs
- 🔒 **Privacy**: Everything runs locally
- ⚡ **Fast**: No network delays
- 📁 **Individual Files**: Easy to link transcripts in HTML
- 🎯 **Reliable**: No API rate limits or outages
- 🔧 **Customizable**: Full control over models and processing

## Notes

- The script creates backups before modifying files
- Audio files are cached locally to avoid re-downloading
- Transcriptions are saved to individual `.txt` files for easy HTML linking
- The script handles both `data-audio` attributes and `source` tags
- Large files may take significant time to process
- Only processes `index.html` to avoid duplicate audio files