'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { AudioClip } from '@/types/audio';
import { audioDb } from '@/lib/audio-db';
import { localStorageService } from '@/lib/local-storage-service';

// Generate a unique session ID for this browser session
function getSessionId() {
  if (typeof window === 'undefined') return 'default-session';
  
  let sessionId = localStorage.getItem('bmir-session-id');
  if (!sessionId) {
    sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('bmir-session-id', sessionId);
  }
  return sessionId;
}

export default function BrowserAudioPlayer() {
  const { useLiveQuery, database } = useFireproof("bmir-audio-player");
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [displayedClips, setDisplayedClips] = useState<AudioClip[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalClips, setTotalClips] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const sessionId = getSessionId();
  
  const PAGE_SIZE = 20; // Load 20 clips at a time

  // Initialize database and load initial state
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        await audioDb.initializeDatabase(database);
        
        // Load saved playback state from localStorage
        const savedState = await localStorageService.getPlayerState(sessionId);
        if (savedState) {
          setVolume(savedState.volume || 1);
          setCurrentTime(savedState.currentTime || 0);
          setIsPlaying(savedState.isPlaying || false);
          
          // Load the saved clip
          if (savedState.currentClipId) {
            const clip = await audioDb.getClipById(database, savedState.currentClipId);
            if (clip) {
              setCurrentClip(clip);
            }
          }
        }
        
        // Load first page of clips
        await loadClipsPage(0);
        
        // If no saved state, start with random clip
        if (!currentClip) {
          const randomClip = await audioDb.getRandomClip(database);
          if (randomClip) {
            setCurrentClip(randomClip);
          }
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

  // Load clips for a specific page
  const loadClipsPage = async (page: number) => {
    setIsLoadingMore(true);
    try {
      const result = await audioDb.getClips(database, page, PAGE_SIZE);
      setDisplayedClips(result.clips);
      setTotalClips(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading clips page:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load more clips (for pagination)
  const loadMoreClips = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await audioDb.getClips(database, nextPage, PAGE_SIZE);
      setDisplayedClips(prev => [...prev, ...result.clips]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more clips:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Save last played track to localStorage on change
  useEffect(() => {
    if (!currentClip) return;
    localStorageService.updatePlayerState(sessionId, { currentClipId: currentClip._id });
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
        
        // Update the current clip's transcript and title
        const updatedClip = {
          ...currentClip,
          transcript: editedTranscript,
          title: isEditingTitle ? editedTitle : currentClip.title,
        };
        setCurrentClip(updatedClip);
        
        // Update the clip in the displayed clips array
        setDisplayedClips(prevClips => 
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
          console.error('Database update failed:', dbError);
        }
        
        setIsEditing(false);
        setIsEditingTitle(false);
        
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('❌ Error saving file');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      setSaveMessage('❌ Error saving file');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTranscript = () => {
    if (!showTranscript) {
      loadFullTranscript();
    }
    setShowTranscript(!showTranscript);
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditedTranscript(fullTranscript);
  };

  const startEditingTitle = () => {
    setIsEditingTitle(true);
    setEditedTitle(currentClip?.title || '');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsEditingTitle(false);
    setEditedTranscript(fullTranscript);
    setEditedTitle(currentClip?.title || '');
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      localStorageService.updatePlayerState(sessionId, { isPlaying: true });
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorageService.updatePlayerState(sessionId, { isPlaying: false });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      localStorageService.updatePlayerState(sessionId, { currentTime: audioRef.current.currentTime });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    localStorageService.updatePlayerState(sessionId, { volume: newVolume });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const goToNext = async () => {
    if (!currentClip) return;
    
    try {
      const nextClip = await audioDb.getNextClip(database, currentClip._id);
      if (nextClip) {
        setCurrentClip(nextClip);
        setShowTranscript(false);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          if (isPlaying) {
            audioRef.current.play();
          }
        }
      }
    } catch (error) {
      console.error('Error getting next clip:', error);
    }
  };

  const goToPrevious = async () => {
    if (!currentClip) return;
    
    try {
      const prevClip = await audioDb.getPreviousClip(database, currentClip._id);
      if (prevClip) {
        setCurrentClip(prevClip);
        setShowTranscript(false);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          if (isPlaying) {
            audioRef.current.play();
          }
        }
      }
    } catch (error) {
      console.error('Error getting previous clip:', error);
    }
  };

  const goToRandom = async () => {
    try {
      const randomClip = await audioDb.getRandomClip(database);
      if (randomClip) {
        setCurrentClip(randomClip);
        setShowTranscript(false);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          if (isPlaying) {
            audioRef.current.play();
          }
        }
      }
    } catch (error) {
      console.error('Error getting random clip:', error);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClipSelect = (clip: AudioClip) => {
    setCurrentClip(clip);
    setShowTranscript(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading BMIR Audio Player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-center space-x-4">
          <img 
            src="/images/Org.png" 
            alt="BMIR Logo" 
            className="h-12 w-auto"
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Random BMIR</h1>
            <h3 className="text-lg font-medium">{totalClips} Audio Clips </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Player Section */}
        <div className="flex-1 p-6">
          {currentClip && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{currentClip.title}</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={goToPrevious}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                  >
                    ⏮ Previous
                  </button>
                  <button
                    onClick={goToRandom}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                  >
                    🎲 Random
                  </button>
                  <button
                    onClick={goToNext}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                  >
                    ⏭ Next
                  </button>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={currentClip.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={goToNext}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    audioRef.current.volume = volume;
                  }
                }}
              />

              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <input
                    type="range"
                    min="0"
                    max={audioRef.current?.duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioRef.current?.duration || 0)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-semibold"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Transcript Section */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={toggleTranscript}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {showTranscript ? 'Hide' : 'Show'} Transcript
                    </button>
                    {showTranscript && (
                      <div className="flex space-x-2">
                        <button
                          onClick={startEditingTitle}
                          className="text-yellow-400 hover:text-yellow-300 text-xs"
                        >
                          Edit Title
                        </button>
                        <button
                          onClick={startEditing}
                          className="text-green-400 hover:text-green-300 text-xs"
                        >
                          Edit Transcript
                        </button>
                      </div>
                    )}
                  </div>

                  {showTranscript && (
                    <div className="bg-gray-700 rounded p-3">
                      {isLoadingTranscript ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                          <p className="mt-2 text-sm">Loading transcript...</p>
                        </div>
                      ) : isEditing || isEditingTitle ? (
                        <div className="space-y-3">
                          {isEditingTitle && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Title:</label>
                              <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                              />
                            </div>
                          )}
                          {isEditing && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Transcript:</label>
                              <textarea
                                value={editedTranscript}
                                onChange={(e) => setEditedTranscript(e.target.value)}
                                rows={8}
                                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white resize-none"
                              />
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={saveTranscript}
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                          {saveMessage && (
                            <p className="text-sm">{saveMessage}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {fullTranscript}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clip List Section */}
        <div className="w-full lg:w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Audio Clips</h3>
            <span className="text-sm text-gray-400">{totalClips} total</span>
          </div>

          {/* <div className="space-y-2">
            {displayedClips.map((clip) => (
              <div
                key={clip._id}
                onClick={() => handleClipSelect(clip)}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  currentClip?._id === clip._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="font-medium text-sm">{clip.title}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {clip.category} • {clip.filename}
                </div>
              </div>
            ))}
          </div> */}
{/* 
          {hasMore && (
            <button
              onClick={loadMoreClips}
              disabled={isLoadingMore}
              className="w-full mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load More Clips'}
            </button>
          )} */}

          {/* {displayedClips.length === 0 && !isLoadingMore && (
            <div className="text-center py-8 text-gray-400">
              <p>No clips loaded</p>
            </div>
          )} */}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 text-center text-sm text-gray-400">
        <div className="flex justify-center items-center space-x-4">
          <a 
            href="/ckdb" 
            className="text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            🗄️ Database Inspector
          </a>
          <span className="text-gray-500">•</span>
          <span>Session: {sessionId.substring(0, 8)}...</span>
          <span className="text-gray-500">•</span>
          <span>{totalClips} clips available</span>
        </div>
      </div>
    </div>
  );
} 