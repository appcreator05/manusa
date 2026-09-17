import React, { useState, useRef, useEffect } from 'react';
import { CachedImage } from './CachedImage';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Share2,
  Bookmark,
  BookmarkCheck,
  Smartphone,
  Check,
  Scaling,
  Expand,
  Zap
} from 'lucide-react';
import { Movie } from '../types';
import { StartIoNativeAd } from './StartIoNativeAd';
import { SAMPLE_MOVIES } from '../data/movies';
import { VDOSKyLogo } from './VDOSKyLogo';
import { hideSystemNavigation, showSystemNavigation } from '../utils/systemBars';

interface MoviePlayPageProps {
  movie: Movie;
  allMovies?: Movie[];
  onBack: () => void;
  onSelectRelatedMovie: (movie: Movie) => void;
  onSelectCategory?: (slug: string, label: string) => void;
  onAdClick?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export const MoviePlayPage: React.FC<MoviePlayPageProps> = ({
  movie,
  allMovies = [],
  onBack,
  onSelectRelatedMovie,
  onSelectCategory,
  onAdClick,
  onFullscreenChange
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFillScreen, setIsFillScreen] = useState(true); // Default true: fills entire mobile display edge-to-edge
  const [showControls, setShowControls] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [activeServerIndex, setActiveServerIndex] = useState(0);

  // Reset server index on movie change
  useEffect(() => {
    setActiveServerIndex(0);
  }, [movie.id]);

  const currentServer = movie.streamServers?.[activeServerIndex] || {
    name: 'Server 1',
    quality: '1080p HD',
    url: movie.videoUrl,
    type: movie.videoType || 'drc'
  };

  const activeUrl = currentServer.url || movie.videoUrl;
  const isYouTube =
    currentServer.type === 'yt' ||
    movie.videoType === 'yt' ||
    activeUrl.includes('youtube.com') ||
    activeUrl.includes('youtu.be') ||
    Boolean(movie.yt);

  // Dynamic viewport dimension tracking for pixel-perfect CSS landscape on portrait devices
  const [viewportDim, setViewportDim] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 360,
    height: typeof window !== 'undefined' ? window.innerHeight : 640
  }));

  const isPortraitViewport = viewportDim.height > viewportDim.width;

  useEffect(() => {
    const updateDimensions = () => {
      setViewportDim({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // Auto-play when opened
  useEffect(() => {
    setIsVideoBuffering(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [movie, activeUrl]);

  // Notify parent component about fullscreen state changes
  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  // Synchronize fullscreen change & screen orientation lock/unlock
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      // When native fullscreen is closed (e.g. via ESC key, back gesture or browser control)
      if (!isCurrentlyFs) {
        setIsFullscreen(false);
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            screen.orientation.unlock();
          }
        } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {}
    };
  }, []);

  // Controls auto-hide timer in fullscreen
  useEffect(() => {
    if (!isFullscreen || !isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [isFullscreen, isPlaying, showControls]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      setIsVideoBuffering(true);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      setIsVideoBuffering(true);
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  /**
   * Fullscreen toggle:
   * 1. Requests native immersive fullscreen with navigationUI: 'hide'
   *    (completely hides Android status bar & bottom navigation bar)
   * 2. Attempts native orientation lock to landscape
   * 3. Uses pixel-perfect CSS landscape rotation if device stays portrait
   */
  const toggleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (isFullscreen) {
      // Exit fullscreen
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        }
      } catch {}

      try {
        if ((window as any).Android && typeof (window as any).Android.unlockOrientation === 'function') {
          (window as any).Android.unlockOrientation();
        }
      } catch {}
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {}
    } else {
      // Enter fullscreen: completely hide Android navigation bar and status bar
      setIsFullscreen(true);
      await hideSystemNavigation();

      try {
        const reqOpts = { navigationUI: 'hide' as const };
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen(reqOpts);
        } else if (container.requestFullscreen) {
          await container.requestFullscreen(reqOpts);
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn('Native requestFullscreen denied or restricted:', err);
      }

      // Force landscape orientation
      try {
        if ((window as any).Android && typeof (window as any).Android.setLandscape === 'function') {
          (window as any).Android.setLandscape();
        }
      } catch {}
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch {
        // Handled by CSS rotation below
      }

      // iOS Safari fallback
      try {
        if ((videoRef.current as any)?.webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } catch {}
    }
  };

  /**
   * Manual Rotate button: switches orientation between landscape and portrait
   */
  const handleManualRotate = async () => {
    if (!isFullscreen) {
      toggleFullscreen();
      return;
    }

    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        const isCurrentlyLandscape = screen.orientation.type.includes('landscape');
        if (isCurrentlyLandscape) {
          await (screen.orientation as any).lock('portrait');
        } else {
          await (screen.orientation as any).lock('landscape');
        }
      }
    } catch {}
  };

  const handleShare = async () => {
    const shareUrl = 'https://www.vdosky.in';
    const shareData = {
      title: `${movie.title} - Watch on VDOSKy`,
      text: `Watch ${movie.title} online in HD on VDOSKy! Explore 3000+ movies & live streams.`,
      url: shareUrl
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err && err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      } else {
        window.prompt('Share link (Copy and share to WhatsApp, Facebook, etc.):', shareUrl);
      }
    } catch {
      window.prompt('Share link (Copy and share to WhatsApp, Facebook, etc.):', shareUrl);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Related movies from the loaded list
  const relatedMovies = (allMovies.length > 0 ? allMovies : SAMPLE_MOVIES)
    .filter((m) => m.id !== movie.id && (m.category === movie.category || allMovies.length < 5))
    .slice(0, 12);

  // Determine whether to apply 90-degree CSS rotation:
  // When in fullscreen and device is still physically in portrait mode (orientation lock not supported by browser)
  const isCssLandscape = isFullscreen && isPortraitViewport;

  const handleBackToMovies = async () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        }
      } catch {}
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {}
    }
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-gray-100 pb-28 animate-fadeIn">
      
      {/* Top Breadcrumb Header (hidden in fullscreen) */}
      {!isFullscreen && (
        <div className="bg-[#0f131c] border-b border-gray-800 px-3 sm:px-6 py-2.5 sticky top-0 z-30 flex items-center justify-between">
          <button
            id="btn-back-to-home"
            onClick={handleBackToMovies}
            className="flex items-center gap-1.5 text-white hover:text-red-400 font-extrabold text-xs sm:text-sm bg-gray-800/90 hover:bg-gray-750 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" />
            <span>Back to Movies</span>
          </button>

          <div className="flex items-center gap-2 truncate max-w-[220px] sm:max-w-md">
            <VDOSKyLogo size={24} />
            <div className="text-right truncate">
              <span className="text-[10px] text-gray-400 block leading-tight">Now Playing on VDOSKy</span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">{movie.title}</h2>
            </div>
          </div>
        </div>
      )}

      <div className={isFullscreen ? 'p-0 m-0' : 'max-w-5xl mx-auto px-2.5 sm:px-6 pt-3 sm:pt-5'}>

        {/* Video Player Container */}
        <div
          ref={playerContainerRef}
          id="main-video-player-container"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
          onClick={() => setShowControls((prev) => !prev)}
          className={
            isFullscreen
              ? 'fixed inset-0 z-[999999] bg-black overflow-hidden w-screen h-screen select-none'
              : 'relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 group select-none'
          }
        >
          {/* Inner Player Stage (rotates 90deg to fill 100% of screen if held in portrait) */}
          <div
            className="relative bg-black overflow-hidden w-full h-full"
            style={
              isCssLandscape
                ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${viewportDim.height}px`, // full height of phone becomes landscape width
                    height: `${viewportDim.width}px`, // full width of phone becomes landscape height
                    transform: 'rotate(90deg) translateY(-100%)',
                    transformOrigin: 'top left',
                    zIndex: 10
                  }
                : {
                    width: '100%',
                    height: '100%',
                    position: 'relative'
                  }
            }
          >
            {/* Video Player Display: YouTube Supported Player OR HTML5 / Plyr Direct */}
            {isYouTube ? (
              <iframe
                src={
                  activeUrl.includes('youtube.com/embed')
                    ? `${activeUrl}${activeUrl.includes('?') ? '&' : '?'}autoplay=1&enablejsapi=1&rel=0&playsinline=1`
                    : `https://www.youtube.com/embed/${movie.yt || movie.videoId || 'hf-EHqaybqI'}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`
                }
                title={movie.title}
                className="w-full h-full border-0 absolute inset-0 block m-0 p-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => setIsVideoBuffering(false)}
              />
            ) : (
              <video
                ref={videoRef}
                src={activeUrl}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={() => setIsVideoBuffering(true)}
                onSeeked={() => {
                  if (videoRef.current && videoRef.current.readyState >= 3) {
                    setIsVideoBuffering(false);
                  }
                }}
                onWaiting={() => setIsVideoBuffering(true)}
                onLoadStart={() => setIsVideoBuffering(true)}
                onStalled={() => setIsVideoBuffering(true)}
                onPlaying={() => {
                  setIsPlaying(true);
                  setIsVideoBuffering(false);
                }}
                onLoadedData={() => setIsVideoBuffering(false)}
                onCanPlay={() => setIsVideoBuffering(false)}
                onCanPlayThrough={() => setIsVideoBuffering(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className={`w-full h-full cursor-pointer transition-all duration-200 ${
                  isFullscreen && isFillScreen
                    ? 'object-cover' // Full Edge-to-edge screen fill with ZERO black bars
                    : 'object-contain' // Original aspect ratio
                }`}
                playsInline
              />
            )}

            {/* Buffering Stream Spinner (Centered in both Normal & Fullscreen Mode) */}
            {isVideoBuffering && !isYouTube && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-40 animate-fadeIn">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white/15 border-t-red-500 border-r-cyan-400 animate-spin mb-3 shadow-[0_0_25px_rgba(0,210,255,0.45)]" />
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-wider drop-shadow-lg">
                  Buffering Stream...
                </span>
              </div>
            )}

            {/* Big Center Play/Pause button when paused (HTML5 video only) */}
            {!isYouTube && !isPlaying && !isVideoBuffering && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-20"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-1" />
                </div>
              </div>
            )}

            {/* Top Bar inside Fullscreen */}
            {isFullscreen && (
              <div
                className={`absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 pointer-events-auto ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    id="btn-player-exit-fs"
                    onClick={toggleFullscreen}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Fullscreen</span>
                  </button>

                  <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md drop-shadow">
                    {movie.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Screen Fit (Fill vs Fit 16:9) Toggle */}
                  <button
                    onClick={() => setIsFillScreen(!isFillScreen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow border ${
                      isFillScreen
                        ? 'bg-[#00b4d8] text-black border-[#00b4d8] font-black'
                        : 'bg-gray-800/90 hover:bg-gray-700 text-white border-gray-700'
                    }`}
                    title={isFillScreen ? 'Switch to Original 16:9 Fit' : 'Fill Entire Screen (Puro Screen)'}
                  >
                    <Scaling className="w-3.5 h-3.5" />
                    <span>{isFillScreen ? 'Puro Screen (Fill)' : 'Fit (16:9)'}</span>
                  </button>

                  {/* Manual Rotate Button */}
                  <button
                    onClick={handleManualRotate}
                    className="p-1.5 bg-gray-800/90 hover:bg-gray-700 text-cyan-400 border border-gray-700 rounded-xl transition-all cursor-pointer"
                    title="Rotate Screen"
                  >
                    <Smartphone className="w-4 h-4 rotate-90" />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Controls Bar (HTML5 video only; YouTube uses native embedded controls) */}
            {!isYouTube && (
              <div
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-2.5 sm:p-4 transition-opacity duration-300 z-30 pointer-events-auto ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Scrubber Range */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onPointerDown={() => setIsVideoBuffering(true)}
                  onMouseDown={() => setIsVideoBuffering(true)}
                  onTouchStart={() => setIsVideoBuffering(true)}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                />

                <div className="flex items-center justify-between mt-2 text-xs sm:text-sm text-gray-200">
                  {/* Left Controls: Play/Pause, Rewind, Forward, Time */}
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <button
                      id="btn-player-play-pause"
                      onClick={togglePlay}
                      className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      onClick={() => skipTime(-10)}
                      className="p-1 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="Rewind 10s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => skipTime(10)}
                      className="p-1 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="Forward 10s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <span className="text-[10px] sm:text-xs text-gray-400 font-mono ml-1">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right Controls: Volume, Fill/Fit, Rotate, HD, Fullscreen */}
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <div className="flex items-center gap-1 group/volume">
                      <button onClick={toggleMute} className="hover:text-red-400 cursor-pointer">
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-12 sm:w-20 h-1 bg-gray-600 rounded cursor-pointer accent-red-600 hidden xs:inline"
                      />
                    </div>

                    {/* Toggle Screen Fill / Fit (Puro Screen) */}
                    <button
                      onClick={() => setIsFillScreen(!isFillScreen)}
                      className="p-1 hover:text-cyan-400 text-gray-300 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      title={isFillScreen ? 'Crop to Fill is ON (Click for Fit)' : 'Click for Puro Screen (Fill)'}
                    >
                      <Expand className="w-4 h-4 text-cyan-400" />
                      <span className="hidden md:inline text-[10px]">{isFillScreen ? 'Fill' : 'Fit'}</span>
                    </button>

                    {/* Rotate Button */}
                    <button
                      onClick={handleManualRotate}
                      className="p-1 hover:text-cyan-400 text-gray-300 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      title="Rotate Screen (Landscape/Portrait)"
                    >
                      <Smartphone className="w-4 h-4 rotate-90 text-cyan-400" />
                      <span className="hidden sm:inline text-[10px]">Rotate</span>
                    </button>

                    <span className="bg-red-600/30 text-red-300 text-[10px] font-black px-1.5 py-0.5 rounded border border-red-500/40">
                      HD
                    </span>

                    {/* Fullscreen Toggle Button */}
                    <button
                      id="btn-player-fullscreen-toggle"
                      onClick={toggleFullscreen}
                      className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                      title="Toggle Fullscreen (Full Display)"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Start.io Native Ad Placed Directly Below Player (hidden in fullscreen) */}
        {!isFullscreen && (
          <>
            <StartIoNativeAd
              variant="player-inline"
              adIndex={1}
              onAdClick={onAdClick}
            />

            {/* Movie Title & Essential Details */}
            <div className="mt-4 bg-[#111724] border border-gray-800/90 rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="bg-amber-400/20 text-amber-400 border border-amber-400/40 text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      ★ {movie.rating}
                    </span>
                    <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded">
                      {movie.year}
                    </span>
                    <span className="bg-gray-800 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded">
                      {movie.duration}
                    </span>

                    {/* Clickable Category Badge: Opens all posts in this category */}
                    <button
                      type="button"
                      onClick={() => onSelectCategory && onSelectCategory(movie.category, movie.categoryLabel)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded border border-red-500/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95 group/cat"
                      title={`View all posts in ${movie.categoryLabel}`}
                    >
                      <span>{movie.categoryLabel}</span>
                      <span className="text-[10px] text-red-400 group-hover/cat:translate-x-0.5 transition-transform font-bold">›</span>
                    </button>

                    {/* Source Player Badge */}
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded border ${
                        isYouTube
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : movie.videoType === 'video'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {isYouTube ? 'YouTube Supported Player' : movie.videoType === 'video' ? 'Worker CDN 1080p' : 'Plyr Direct 1080p'}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {movie.title}
                  </h1>

                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1.5 flex-wrap">
                    <span className="font-semibold text-gray-300">Audio:</span>
                    {(movie.audioLanguages || ['Hindi (Original)']).map((lang) => (
                      <span key={lang} className="bg-gray-800/80 text-gray-300 px-2 py-0.5 rounded text-[11px]">
                        {lang}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {(movie.genres || []).map((g) => (
                      <span key={g} className="text-xs bg-gray-800 text-cyan-300/90 px-2.5 py-0.5 rounded-md border border-gray-700">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      isBookmarked
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
                    }`}
                    title="Save to Watchlist"
                  >
                    {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    <span>{isBookmarked ? 'Saved' : 'Watchlist'}</span>
                  </button>
                </div>
              </div>

              {/* Streaming Server Switcher Pills */}
              {movie.streamServers && movie.streamServers.length > 0 && (
                <div className="mt-3.5 bg-gray-900/70 p-2.5 sm:p-3 rounded-xl border border-gray-800 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1 shrink-0">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Stream Server:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {movie.streamServers.map((srv, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveServerIndex(idx);
                          setIsVideoBuffering(true);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          idx === activeServerIndex
                            ? 'bg-gradient-to-r from-red-600 to-cyan-500 text-white shadow-md font-bold'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                        }`}
                      >
                        <span>{srv.name}</span>
                        <span className="text-[10px] opacity-75 font-mono">({srv.quality})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis & Cast */}
              <div className="mt-5 border-t border-gray-800/80 pt-4">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Movie Synopsis &amp; Cast
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {movie.description || `${movie.title} starring ${movie.cast.join(', ')}.`}
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>
                    <strong className="text-gray-300">Category:</strong> {movie.categoryLabel}
                  </div>
                  <div>
                    <strong className="text-gray-300">Cast:</strong> {movie.cast.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Related Movies Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-5 bg-red-600 rounded-full" />
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Related Movies &amp; Recommendations
                </h2>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-none smooth-scroll-container">
                {relatedMovies.map((relMovie) => (
                  <div
                    key={relMovie.id}
                    onClick={() => onSelectRelatedMovie(relMovie)}
                    className="w-32 sm:w-40 shrink-0 flex flex-col cursor-pointer group select-none"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#151922] border border-gray-800 group-hover:border-red-500 transition-all">
                      <CachedImage
                        src={relMovie.poster}
                        alt={relMovie.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-1.5 right-1.5 bg-black/80 text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-500/60">
                        ★ {relMovie.rating}
                      </div>
                    </div>
                    <h4 className="text-xs font-semibold text-gray-200 group-hover:text-red-400 truncate mt-1.5">
                      {relMovie.title}
                    </h4>
                    <span className="text-[10px] text-gray-400">{relMovie.year}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

