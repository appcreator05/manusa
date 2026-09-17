import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { Movie, AdCreative } from '../types';
import { START_IO_ADS } from '../data/movies';

interface StartIoRewardedVideoAdProps {
  movie: Movie;
  onCloseAndPlay: () => void;
  skipCountdownSeconds?: number;
  onAdClick?: () => void;
  onAdImpression?: () => void;
  customAdUrl?: string;
}

export const StartIoRewardedVideoAd: React.FC<StartIoRewardedVideoAdProps> = ({
  movie,
  onCloseAndPlay,
  skipCountdownSeconds = 5,
  onAdClick,
  onAdImpression,
  customAdUrl
}) => {
  const [countdown, setCountdown] = useState(skipCountdownSeconds);
  const [isRewarded, setIsRewarded] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentAdIndex] = useState(() => Math.floor(Math.random() * START_IO_ADS.length));
  const [videoSrc, setVideoSrc] = useState(() => START_IO_ADS[0].mediaVideo || 'https://media.w3.org/2010/05/sintel/trailer.mp4');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentAd: AdCreative = START_IO_ADS[currentAdIndex] || START_IO_ADS[0];

  useEffect(() => {
    onAdImpression?.();
    if (currentAd.mediaVideo) {
      setVideoSrc(currentAd.mediaVideo);
    }
  }, []);

  // Countdown timer for Rewarded Video skip option
  useEffect(() => {
    if (countdown <= 0) {
      setIsRewarded(true);
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRewarded(true);
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Autoplay video with audio fallback
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // If unmuted autoplay blocked by browser, retry muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [videoSrc]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdClick?.();
    const targetUrl = customAdUrl?.trim() || currentAd.ctaUrl;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Called when user clicks Skip Ad or when video finishes
  const handleSkipOrComplete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onCloseAndPlay();
  };

  const handleVideoEnded = () => {
    setIsRewarded(true);
    setCanSkip(true);
    // Automatic transition when entire video ad concludes
    handleSkipOrComplete();
  };

  const handleVideoError = () => {
    // Fallback stream if needed
    setVideoSrc('https://media.w3.org/2010/05/sintel/trailer.mp4');
  };

  // Skip progress ring calculation
  const progressRatio = Math.min(1, Math.max(0, (skipCountdownSeconds - countdown) / skipCountdownSeconds));

  return (
    <div
      id="startio-rewarded-video-fullscreen"
      className="fixed inset-0 z-[99999] bg-black w-screen h-screen flex items-center justify-center overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* 100% True Fullscreen Edge-to-Edge Video Player */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={currentAd.mediaImage}
        playsInline
        muted={isMuted}
        autoPlay
        loop={false}
        className="w-full h-full object-contain sm:object-cover bg-black"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
      />

      {/* Top Bar Floating Overlays */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between pointer-events-none z-20">
        {/* Top-Left: Start.io Ad Tag */}
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 shadow-xl pointer-events-auto">
          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-black stroke-[3]" />
          </div>
          <span className="text-white text-xs font-bold tracking-wide">Start.io</span>
          <span className="text-gray-400 text-[10px]">· Rewarded Video</span>
        </div>

        {/* Top-Right: Start.io Real Countdown & Skip Ad Button */}
        <div className="pointer-events-auto">
          {canSkip ? (
            <button
              id="btn-startio-skip-rewarded"
              onClick={handleSkipOrComplete}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-black font-extrabold text-xs sm:text-sm px-4 py-2 rounded-full shadow-2xl shadow-amber-500/50 flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
            >
              <span>Skip Ad</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gray-700 text-white shadow-xl">
              {/* Circular countdown spinner */}
              <div className="relative w-5 h-5 flex items-center justify-center">
                <svg className="w-5 h-5 transform -rotate-90">
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke="#374151"
                    strokeWidth="2.5"
                    fill="transparent"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    fill="transparent"
                    strokeDasharray={50.26}
                    strokeDashoffset={50.26 * (1 - progressRatio)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-amber-400">
                  {countdown}
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-200">
                Reward in {countdown}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Overlays */}
      <div className="absolute bottom-4 inset-x-4 sm:inset-x-6 flex items-center justify-between pointer-events-none z-20">
        {/* Bottom-Left: Sound Control */}
        <button
          onClick={toggleSound}
          className="pointer-events-auto bg-black/75 hover:bg-black/90 backdrop-blur-md border border-gray-700 hover:border-amber-400 text-white text-xs px-3.5 py-2 rounded-full flex items-center gap-2 shadow-2xl transition-all cursor-pointer"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-xs">Unmute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-xs">Mute</span>
            </>
          )}
        </button>

        {/* Bottom-Right: Subtle Advertiser CTA */}
        <button
          onClick={handleCtaClick}
          className="pointer-events-auto bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-full border border-cyan-400/50 shadow-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <span>{currentAd.ctaText || 'Learn More'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Progress Bar Line */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-800/80 z-20">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000 ease-linear"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>
    </div>
  );
};
