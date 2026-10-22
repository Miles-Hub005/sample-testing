'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Subtitles,
  Download,
  FileText,
  Paperclip,
  Video,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { AttachmentResponse } from '../../services/knowledge';

// ============================================================================
// Types & Interfaces [FR-5, FR-6, NFR-2]
// ============================================================================

export interface MediaPlayerProps {
  /**
   * Video stream URL (e.g., MP4 stream, HTTPS URL, CDN tokenized URL).
   */
  videoUrl?: string | null;

  /**
   * Title of the training video module.
   */
  title?: string;

  /**
   * Optional technical documentation and downloadable file attachments [FR-6].
   */
  attachments?: AttachmentResponse[];

  /**
   * Optional poster image thumbnail URL.
   */
  posterUrl?: string;

  /**
   * Whether to autoplay the video stream on initial load.
   */
  autoPlay?: boolean;

  /**
   * Callback invoked when video playback reaches the end.
   */
  onEnded?: () => void;

  /**
   * Custom CSS class name.
   */
  className?: string;
}

export const SPEED_OPTIONS: readonly number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// Format seconds into MM:SS or HH:MM:SS string
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
  const formattedSecs = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const formattedHrs = hrs < 10 ? `0${hrs}` : `${hrs}`;
    return `${formattedHrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${formattedMins}:${formattedSecs}`;
}

// Format file size in bytes to human-readable KB/MB string
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ============================================================================
// MediaPlayer Component [FR-5, FR-6, NFR-2, NFR-5]
// ============================================================================

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  videoUrl,
  title = 'Training Video Stream',
  attachments = [],
  posterUrl,
  autoPlay = false,
  onEnded,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  }, [isPlaying]);

  // Handle video playback time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setHasError(false);
    }
  }, []);

  // Seek handler
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, []);

  // Speed rate change
  const handleSpeedChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, []);

  // Volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  }, []);

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  }, [isMuted]);

  // Captions toggle
  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((prev) => !prev);
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = !captionsEnabled ? 'showing' : 'hidden';
      }
    }
  }, [captionsEnabled]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    const container = playerContainerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [togglePlay, toggleMute, toggleFullscreen]);

  return (
    <div
      className={cn(
        'w-full space-y-6 rounded-lg border border-[#d1c4b9] bg-[#fbf9f4] p-5 shadow-sm text-[#1b1c19]',
        className
      )}
      data-testid="media-player-container"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#d1c4b9]">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-[#59452b]" aria-hidden="true" />
          <h3 className="text-base font-semibold text-[#1b1c19]">{title}</h3>
        </div>
      </div>

      {/* Video Player Box [FR-5] */}
      <div
        ref={playerContainerRef}
        tabIndex={0}
        aria-label="Training video player container"
        className="relative w-full overflow-hidden rounded-lg border border-[#80756b] bg-[#1b1c19] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#735c41]"
        data-testid="video-player-frame"
      >
        {!videoUrl || hasError ? (
          /* Empty / Missing Video URL State */
          <div className="flex min-h-[280px] w-full flex-col items-center justify-center p-6 text-center text-[#f2f1ec]">
            <AlertCircle className="h-10 w-10 text-[#fd7d69] mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold">No Video Stream Available</p>
            <p className="mt-1 text-xs text-[#dbdad5]">
              {hasError
                ? 'Failed to load video stream from provider or invalid media format.'
                : 'No video stream URL is attached to this training module.'}
            </p>
          </div>
        ) : (
          /* Video Stream Element & Custom Controls */
          <div className="group relative w-full">
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl}
              autoPlay={autoPlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => {
                setIsPlaying(false);
                onEnded?.();
              }}
              onError={() => setHasError(true)}
              className="h-auto max-h-[480px] w-full object-contain bg-[#000000]"
            />

            {/* Overlay Big Play Button */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video"
                className="absolute inset-0 flex items-center justify-center bg-[#000000]/40 transition-opacity hover:bg-[#000000]/30 focus:outline-none"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#59452b] text-[#ffffff] shadow-lg hover:scale-105 transition-transform">
                  <Play className="h-8 w-8 ml-1" />
                </div>
              </button>
            )}

            {/* Custom Control Bar [FR-5] */}
            <div
              className="w-full bg-[#1b1c19]/90 px-4 py-2.5 text-[#f2f1ec] space-y-2"
              data-testid="video-controls-bar"
            >
              {/* Timeline Seek Scrubber Bar */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Video seek bar slider"
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#80756b] accent-[#f5d6b4] focus:outline-none"
                />
              </div>

              {/* Control Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Left: Play/Pause, Time */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="p-1 text-[#f2f1ec] hover:text-[#f5d6b4] focus:outline-none"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>

                  <span className="font-mono text-xs text-[#dbdad5]">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Right: Volume, Speed, Captions, Fullscreen */}
                <div className="flex items-center gap-3">
                  {/* Volume Control */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                      className="p-1 hover:text-[#f5d6b4] focus:outline-none"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      aria-label="Audio volume slider"
                      className="h-1 w-16 cursor-pointer appearance-none rounded bg-[#80756b] accent-[#f5d6b4]"
                    />
                  </div>

                  {/* Playback Speed Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase text-[#dbdad5]">Speed:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                      aria-label="Playback speed"
                      className="rounded border border-[#80756b] bg-[#30312e] px-1.5 py-0.5 text-xs text-[#f2f1ec] focus:outline-none"
                    >
                      {SPEED_OPTIONS.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate === 1.0 ? '1.0x (Normal)' : `${rate}x`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Captions Toggle */}
                  <button
                    type="button"
                    onClick={toggleCaptions}
                    aria-pressed={captionsEnabled}
                    aria-label="Toggle closed captions"
                    className={cn(
                      'p-1 rounded transition-colors focus:outline-none',
                      captionsEnabled ? 'text-[#f5d6b4]' : 'text-[#dbdad5] hover:text-[#f2f1ec]'
                    )}
                  >
                    <Subtitles className="h-4 w-4" />
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen view"
                    className="p-1 hover:text-[#f5d6b4] focus:outline-none"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Linked Technical Documentation & File Attachments [FR-6] */}
      <div className="space-y-3 pt-3 border-t border-[#d1c4b9]">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-[#715a3f]" aria-hidden="true" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#715a3f]">
            Technical Documentation & Downloads ({attachments.length})
          </h4>
        </div>

        {attachments.length === 0 ? (
          <p className="text-xs text-[#80756b] italic">
            No attached documentation or downloadable files linked to this module.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-testid="attachments-list">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={att.file_name}
                className="flex items-center justify-between rounded-md border border-[#d1c4b9] bg-[#ffffff] p-3 text-xs text-[#1b1c19] hover:border-[#59452b] hover:bg-[#f5f3ee] transition-all shadow-xs group focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileText className="h-5 w-5 shrink-0 text-[#715a3f]" aria-hidden="true" />
                  <div className="truncate">
                    <p className="font-semibold text-[#1b1c19] truncate group-hover:text-[#59452b]">
                      {att.file_name}
                    </p>
                    <p className="text-[11px] text-[#80756b]">
                      {formatFileSize(att.file_size_bytes)}
                    </p>
                  </div>
                </div>
                <FileDown className="h-4 w-4 shrink-0 text-[#80756b] group-hover:text-[#59452b] ml-2" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
