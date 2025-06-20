'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFireproof } from 'use-fireproof';
import { AudioClip, PlaybackState } from '@/types/audio';
import { audioDb } from '@/lib/audio-db';

export default function FireproofAudioPlayer() {
  const { useLiveQuery } = useFireproof("bmir-audio-player");
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Query all audio clips using Fireproof
  const response = useLiveQuery('category', { limit: 1000 });
  const clips = response.docs as AudioClip[];

  // Initialize database and load initial state
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        await audioDb.initializeDatabase();
        
        // Load saved playback state
        const savedState = await audioDb.getPlaybackState();
        if (savedState) {
          setVolume(savedState.volume || 1);
          setCurrentTime(savedState.currentTime || 0);
          setIsPlaying(savedState.isPlaying || false);
          
          // Load the saved clip
          if (savedState.currentClipId) {
            const clip = clips.find(c => c._id === savedState.currentClipId);
            if (clip) {
              setCurrentClip(clip);
            }
          }
        }
        
        // If no saved state, start with first clip
        if (!currentClip && clips.length > 0) {
          setCurrentClip(clips[0]);
        }
      } catch (error) {
        console.error('Error initializing player:', error);
        if (clips.length > 0) {
          setCurrentClip(clips[0]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (clips.length > 0) {
      initializePlayer();
    }
  }, [clips]);

  // Save playback state when it changes
  useEffect(() => {
    if (!currentClip) return;
    
    const saveState = async () => {
      await audioDb.savePlaybackState({
        currentClipId: currentClip._id,
        volume,
        isPlaying,
        currentTime,
      });
    };
    
    saveState();
  }, [currentClip?._id, volume, isPlaying, currentTime]);

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
    
    const nextClip = await audioDb.getNextClip(currentClip._id);
    if (nextClip) {
      setCurrentClip(nextClip);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const goToPrevious = async () => {
    if (!currentClip) return;
    
    const prevClip = await audioDb.getPreviousClip(currentClip._id);
    if (prevClip) {
      setCurrentClip(prevClip);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const goToRandom = async () => {
    const randomClip = await audioDb.getRandomClip();
    if (randomClip) {
      setCurrentClip(randomClip);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading Fireproof Audio Player...</div>
      </div>
    );
  }

  if (!currentClip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">No audio clips available</div>
      </div>
    );
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-yellow-400 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">BMIR Audio Player</h1>
          <h2 className="text-xl text-gray-600">{currentClip.title}</h2>
          <p className="text-sm text-gray-500 mt-2">
            {clips.length} clips available • 🔥 FIREPROOF STORAGE 🔥
          </p>
          <div className="mt-2 p-2 bg-green-100 text-green-800 rounded">
            ✅ This is the FIREPROOF version with persistent storage!
          </div>
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
        <div className="text-center">
          <button
            onClick={goToRandom}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            🎲 Random Clip
          </button>
        </div>

        {/* Clip Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Clip Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Category:</strong> {currentClip.category}</p>
            <p><strong>Filename:</strong> {currentClip.filename}</p>
            <p><strong>Status:</strong> 🔥 Fireproof local storage • Persistent state 🔥</p>
            {currentClip.transcript && (
              <p><strong>Transcript:</strong> {currentClip.transcript.slice(0, 100)}...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 