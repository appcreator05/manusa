import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, Star, Volume2, VolumeX, ShieldAlert, Sparkles, Film, ArrowRight } from 'lucide-react';
import { Movie, AdCreative } from '../types';
import { START_IO_ADS } from '../data/movies';

interface StartIoInterstitialAdProps {
  movie: Movie;
  onCloseAndPlay: () => void;
  skipCountdownSeconds?: number;
  onAdClick?: () => void;
  onAdImpression?: () => void;
  customAdUrl?: string;
}

export const StartIoInterstitialAd: React.FC<StartIoInterstitialAdProps> = ({
  movie,
  onCloseAndPlay,
  skipCountdownSeconds = 5,
  onAdClick,
  onAdImpression,
  customAdUrl
}) => {
  const [countdown, setCountdown] = useState(skipCountdownSeconds);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(() => Math.floor(Math.random() * START_IO_ADS.length));

  const currentAd: AdCreative = START_IO_ADS[currentAdIndex];

  // Track impression on mount
  useEffect(() => {
    onAdImpression?.();
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (countdown <= 0) {
      setCanSkip(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleCtaClick = () => {
    onAdClick?.();
    const targetUrl = customAdUrl?.trim() || currentAd.ctaUrl;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSkipOrClose = () => {
    onCloseAndPlay();
  };

  // Progress percentage
  const progressPercent = ((skipCountdownSeconds - countdown) / skipCountdownSeconds) * 100;

  return (
    <div
      id="startio-interstitial-overlay"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar with Start.io Header & Countdown/Close */}
      <div className="w-full bg-[#0a0d14] border-b border-gray-800/80 px-4 py-3 flex items-center justify-between shadow-md">
        {/* Start.io Logo & Advertiser Label */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#00b4d8] flex items-center justify-center font-black text-black text-xs">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-xs tracking-wider">Start.io</span>
              <span className="bg-gray-800 text-gray-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-700">
                INTERSTITIAL AD
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-none">
              Sponsored Advertisement
            </p>
          </div>
        </div>

        {/* Right side: Countdown or Skip/Close button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {canSkip ? (
            <button
              id="btn-skip-interstitial"
              onClick={handleSkipOrClose}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-[#00b4d8] hover:from-cyan-400 hover:to-[#0096c7] text-black font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl shadow-lg transition-all animate-pulse active:scale-95 cursor-pointer"
            >
              <span>Continue to Movie</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Ad closes in {countdown}s</span>
            </div>
          )}

          {/* Close X (always visible once canSkip is true) */}
          {canSkip && (
            <button
              id="btn-close-interstitial-x"
              onClick={handleSkipOrClose}
              className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors cursor-pointer"
              title="Close Ad"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar under top bar */}
      <div className="w-full bg-gray-900 h-1">
        <div
          className="bg-cyan-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_8px_#00b4d8]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Interstitial Ad Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center">
        
        {/* Next Up Movie Teaser Notification */}
        <div className="w-full max-w-lg mb-3 flex items-center justify-between bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-gray-300 truncate">
            <Film className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-gray-400">Next:</span>
            <span className="font-bold text-white truncate">{movie.title}</span>
          </div>
          <span className="bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded text-[10px] shrink-0">
            {movie.rating} ★
          </span>
        </div>

        {/* Ad Card Container */}
        <div className="w-full max-w-lg bg-[#121722] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Creative Media Preview */}
          <div className="relative w-full aspect-video bg-black overflow-hidden group cursor-pointer" onClick={handleCtaClick}>
            <img
              src={currentAd.mediaImage}
              alt={currentAd.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-[#121722] via-transparent to-black/40" />

            {/* Top Badge */}
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-cyan-400 border border-cyan-500/50 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>START.IO REWARD AD</span>
            </div>

            {/* Ratings on media */}
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-500/50 flex items-center gap-1">
              <span>★</span>
              <span>{currentAd.rating}</span>
              <span className="text-gray-400 text-[10px]">({currentAd.reviewsCount})</span>
            </div>
          </div>

          {/* Advertiser Details & Action */}
          <div className="p-4 sm:p-5 flex flex-col gap-3">
            
            <div className="flex items-start gap-3.5">
              <img
                src={currentAd.icon}
                alt={currentAd.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-gray-700 shadow-md shrink-0 cursor-pointer"
                onClick={handleCtaClick}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
                  {currentAd.appCategory}
                </div>
                <h3
                  onClick={handleCtaClick}
                  className="text-lg font-black text-white leading-snug truncate hover:text-cyan-400 cursor-pointer transition-colors"
                >
                  {currentAd.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                  {currentAd.tagline}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
              {currentAd.description}
            </p>

            {/* Big Install / CTA Button */}
            <button
              id={`btn-interstitial-cta-${currentAd.id}`}
              onClick={handleCtaClick}
              className="w-full bg-gradient-to-r from-[#00b4d8] to-[#0077b6] hover:from-[#0096c7] hover:to-[#023e8a] active:scale-[0.98] text-black font-black text-sm sm:text-base py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>{currentAd.ctaText}</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </button>

            {/* Bottom info footer */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-1">
              <span>Verified Safe by Start.io</span>
              {currentAd.installs && <span>{currentAd.installs} Downloads</span>}
              {currentAd.appSize && <span>Size: {currentAd.appSize}</span>}
            </div>

          </div>

        </div>

      </div>

      {/* Bottom bar with action to proceed to the movie play page */}
      <div className="w-full bg-[#0a0d14] border-t border-gray-800 px-4 py-3 text-center">
        {canSkip ? (
          <button
            id="btn-bottom-continue-movie"
            onClick={handleSkipOrClose}
            className="w-full max-w-lg mx-auto bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Skip Ad & Play "{movie.title}"</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <p className="text-xs text-gray-400">
            Please wait <span className="text-cyan-400 font-bold">{countdown}s</span> to unlock playback for <strong className="text-white">{movie.title}</strong>
          </p>
        )}
      </div>

    </div>
  );
};
