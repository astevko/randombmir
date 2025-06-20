"""
Random BMIR Audio Tools

Audio transcription and backup tools for Random BMIR audio excerpts.
"""

__version__ = "0.1.0"
__author__ = "randombmir"

from .transcribe_audio import AudioTranscriber
from .download_backup import AudioBackupDownloader

__all__ = ["AudioTranscriber", "AudioBackupDownloader"] 