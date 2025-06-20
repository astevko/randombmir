'use client';

import { useState, useEffect, useRef } from 'react';

// Sample audio data for testing
const sampleAudioClips = [
  {
    id: '1',
    title: "Automatas Secret Gateway to Time Travel",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/01+secret.mp3",
    category: "camps-arts",
    filename: "01+secret.mp3",
  },
  {
    id: '2',
    title: "Are you horny enough",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/02+horny.mp3",
    category: "camps-arts",
    filename: "02+horny.mp3",
  },
  {
    id: '3',
    title: "Dodge Ball Frenzy in Barbie Death Village",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/camps+and+arts/03+dodgeball.mp3",
    category: "camps-arts",
    filename: "03+dodgeball.mp3",
  },
  {
    id: '4',
    title: "Trans",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/long+talks/01+trans.mp3",
    category: "long-talks",
    filename: "01+trans.mp3",
  },
  {
    id: '5',
    title: "Chiptune",
    audioUrl: "https://s3-us-west-1.amazonaws.com/randombmir/random/01+chiptune.mp3",
    category: "random",
    filename: "01+chiptune.mp3",
  },
];

export default function BrowserAudioPlayer() {
  const [currentClip, setCurrentClip] = useState(sampleAudioClips[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

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
  const goToNext = () => {
    const currentIndex = sampleAudioClips.findIndex(clip => clip.id === currentClip.id);
    const nextIndex = (currentIndex + 1) % sampleAudioClips.length;
    const nextClip = sampleAudioClips[nextIndex];
    setCurrentClip(nextClip);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const goToPrevious = () => {
    const currentIndex = sampleAudioClips.findIndex(clip => clip.id === currentClip.id);
    const prevIndex = currentIndex === 0 ? sampleAudioClips.length - 1 : currentIndex - 1;
    const prevClip = sampleAudioClips[prevIndex];
    setCurrentClip(prevClip);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const goToRandom = () => {
    const randomIndex = Math.floor(Math.random() * sampleAudioClips.length);
    const randomClip = sampleAudioClips[randomIndex];
    setCurrentClip(randomClip);
    setCurrentTime(0);
    setIsPlaying(false);
  };

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
            {sampleAudioClips.length} clips available • Browser Version
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
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
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
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
            <p><strong>Status:</strong> Browser-compatible version (no Redis/Fireproof)</p>
          </div>
        </div>
      </div>
    </div>
  );
} 