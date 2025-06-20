'use client';

import { useState, useRef, useEffect } from 'react';
import { useFireproof } from 'use-fireproof';
import { AudioClip } from '@/types/audio';
import { audioDb } from '@/lib/audio-db';

// Helper to get or create a session ID
function getSessionId() {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem('bmir_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('bmir_session_id', sessionId);
  }
  return sessionId;
}

export default function BrowserAudioPlayer() {
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [allClips, setAllClips] = useState<AudioClip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { database } = useFireproof("bmir-audio-player");
  const sessionId = getSessionId();

  // Initialize database and load clips
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        await audioDb.initializeDatabase(database);
        
        // Try to get clips with retry logic
        let clips: AudioClip[] = [];
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            clips = await audioDb.getAllClips(database);
            break; // Success, exit the retry loop
          } catch (error) {
            retryCount++;
            console.log(`Attempt ${retryCount} failed, retrying...`, error);
            if (retryCount >= maxRetries) {
              console.error('Max retries reached, clearing database and reloading...');
              // Clear local storage and reload
              const keys = Object.keys(localStorage);
              const dbKeys = keys.filter(key => key.includes('bmir-audio-player'));
              dbKeys.forEach(key => localStorage.removeItem(key));
              window.location.reload();
              return;
            }
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        setAllClips(clips);
        
        // Fetch last played from Redis
        let lastClipId = '';
        try {
          const res = await fetch(`/api/player-state?sessionId=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            lastClipId = data?.playerState?.currentClipId || '';
          }
        } catch {}
        
        if (clips.length > 0) {
          const found = lastClipId && clips.find(c => c._id === lastClipId);
          setCurrentClip(found || clips[0]);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePlayer();

    // Expose reset function globally for debugging
    (window as any).resetAudioDatabase = async () => {
      try {
        // Clear local storage for this database
        const keys = Object.keys(localStorage);
        const dbKeys = keys.filter(key => key.includes('bmir-audio-player'));
        dbKeys.forEach(key => localStorage.removeItem(key));
        
        console.log('Local storage cleared, reloading page...');
        window.location.reload();
      } catch (error) {
        console.error('Error resetting database:', error);
      }
    };
  }, [database]);

  // Save last played track to Redis on change
  useEffect(() => {
    if (!currentClip) return;
    fetch('/api/player-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        playerState: { currentClipId: currentClip._id },
      }),
    });
  }, [currentClip, sessionId]);

  // Load full transcript when current clip changes
  useEffect(() => {
    if (currentClip && showTranscript) {
      loadFullTranscript();
    }
  }, [currentClip, showTranscript]);

  const loadFullTranscript = async () => {
    if (!currentClip) return;
    
    setIsLoadingTranscript(true);
    try {
      // Try to load from the API (which reads from .txt file)
      const response = await fetch(`/api/transcript?filename=${encodeURIComponent(currentClip.filename)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFullTranscript(data.content);
          setEditedTranscript(data.content);
        } else {
          // Fallback to the transcript from the database
          setFullTranscript(currentClip.transcript || 'No transcript available');
          setEditedTranscript(currentClip.transcript || 'No transcript available');
        }
      } else {
        // Fallback to the transcript from the database
        setFullTranscript(currentClip.transcript || 'No transcript available');
        setEditedTranscript(currentClip.transcript || 'No transcript available');
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      // Fallback to the transcript from the database
      setFullTranscript(currentClip.transcript || 'No transcript available');
      setEditedTranscript(currentClip.transcript || 'No transcript available');
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const saveTranscript = async () => {
    if (!currentClip) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: currentClip.filename,
          content: editedTranscript,
          title: isEditingTitle ? editedTitle : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage('✅ File saved successfully!');
        setFullTranscript(editedTranscript);
        
        // Update the current clip's transcript and title in the database and memory
        const updatedClip = {
          ...currentClip,
          transcript: editedTranscript,
          title: isEditingTitle ? editedTitle : currentClip.title,
        };
        setCurrentClip(updatedClip);
        
        // Update the clip in the allClips array
        setAllClips(prevClips => 
          prevClips.map(clip => 
            clip._id === currentClip._id 
              ? { 
                  ...clip, 
                  transcript: editedTranscript,
                  title: isEditingTitle ? editedTitle : clip.title,
                }
              : clip
          )
        );
        
        // Update the database
        try {
          await audioDb.updateClipTranscript(database, currentClip._id, editedTranscript);
          if (isEditingTitle) {
            await audioDb.updateClipTitle(database, currentClip._id, editedTitle);
          }
        } catch (dbError) {
          console.log('Database update failed, but file was saved:', dbError);
        }
        
        setIsEditing(false);
        setIsEditingTitle(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('❌ Error saving file: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveMessage('❌ Error saving file');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTranscript = () => {
    if (!showTranscript) {
      setShowTranscript(true);
      setIsEditing(false);
      setIsEditingTitle(false);
      setSaveMessage('');
    } else {
      setShowTranscript(false);
      setFullTranscript('');
      setEditedTranscript('');
      setEditedTitle('');
      setIsEditing(false);
      setIsEditingTitle(false);
      setSaveMessage('');
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditedTranscript(fullTranscript);
    setSaveMessage('');
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setEditedTitle(currentClip?.title || '');
    setSaveMessage('');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsEditingTitle(false);
    setEditedTranscript(fullTranscript);
    setEditedTitle(currentClip?.title || '');
    setSaveMessage('');
  };

  // Audio event handlers
  const handlePlay = () => {
    setIsPlaying(true);
    audioRef.current?.play();
  };

  const handlePause = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Navigation functions
  const goToNext = async () => {
    if (!currentClip) return;
    const nextClip = await audioDb.getNextClip(database, currentClip._id);
    if (nextClip) {
      setCurrentClip(nextClip);
      setCurrentTime(0);
      setIsPlaying(false);
      if (showTranscript) {
        setShowTranscript(false);
        setFullTranscript('');
      }
    }
  };

  const goToPrevious = async () => {
    if (!currentClip) return;
    const prevClip = await audioDb.getPreviousClip(database, currentClip._id);
    if (prevClip) {
      setCurrentClip(prevClip);
      setCurrentTime(0);
      setIsPlaying(false);
      if (showTranscript) {
        setShowTranscript(false);
        setFullTranscript('');
      }
    }
  };

  const goToRandom = async () => {
    const randomClip = await audioDb.getRandomClip(database);
    if (randomClip) {
      setCurrentClip(randomClip);
      setCurrentTime(0);
      setIsPlaying(false);
      if (showTranscript) {
        setShowTranscript(false);
        setFullTranscript('');
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-yellow-400 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-lg text-gray-800">Loading audio clips...</p>
        </div>
      </div>
    );
  }

  if (!currentClip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-yellow-400 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-800">No audio clips available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-yellow-400 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">BMIR Audio Player</h1>
          <h2 className="text-xl text-gray-600">{currentClip.title}</h2>
          <p className="text-sm text-gray-500 mt-2">
            {allClips.length} clips available • Browser Version
          </p>
        </div>

        {/* Audio Player */}
        <div className="mb-8">
          <audio
            ref={audioRef}
            src={currentClip.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={goToNext}
            onPlay={handlePlay}
            onPause={handlePause}
            preload="metadata"
          />
          
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={audioRef.current?.duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(audioRef.current?.duration || 0)}</span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={goToPrevious}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ⏮ Previous
          </button>
          
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button
            onClick={goToNext}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Next ⏭
          </button>
        </div>

        {/* Random Button */}
        <div className="text-center mb-8">
          <button
            onClick={goToRandom}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            🎲 Random Clip
          </button>
        </div>

        {/* Transcript Button */}
        <div className="text-center mb-8">
          <button
            onClick={toggleTranscript}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {showTranscript ? '📄 Close Transcript' : '📄 Open Full Transcript'}
          </button>
        </div>

        {/* Full Transcript Modal */}
        {showTranscript && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <div className="flex-1">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-xl font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                      placeholder="Enter title..."
                    />
                  ) : (
                    <h3 className="text-xl font-semibold text-gray-800">
                      {currentClip.title}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && !isEditingTitle && (
                    <>
                      <button
                        onClick={startEditingTitle}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
                      >
                        ✏️ Edit Title
                      </button>
                      <button
                        onClick={startEditing}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        ✏️ Edit Transcript
                      </button>
                    </>
                  )}
                  <button
                    onClick={toggleTranscript}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Save Message */}
              {saveMessage && (
                <div className={`px-6 py-2 text-sm ${
                  saveMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {saveMessage}
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingTranscript ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                    <span className="ml-2">Loading transcript...</span>
                  </div>
                ) : (isEditing || isEditingTitle) ? (
                  <div className="space-y-4">
                    {isEditing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transcript:
                        </label>
                        <textarea
                          value={editedTranscript}
                          onChange={(e) => setEditedTranscript(e.target.value)}
                          className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Edit the transcript here..."
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveTranscript}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          '💾 Save'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {fullTranscript}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clip Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Clip Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Category:</strong> {currentClip.category}</p>
            <p><strong>Filename:</strong> {currentClip.filename}</p>
            <p><strong>Status:</strong> Browser-compatible version (no Redis/Fireproof)</p>
            {currentClip.transcript && (
              <div className="mt-4">
                <p><strong>Transcript Preview:</strong></p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-3">{currentClip.transcript}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 