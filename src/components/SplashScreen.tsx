import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  isVisible: boolean;
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible,
  onFinish,
  minDurationMs = 2200
}) => {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Animate progress smoothly
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const jump = Math.floor(Math.random() * 15) + 8;
        return Math.min(prev + jump, 95);
      });
    }, 250);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onFinish) onFinish();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isVisible, onFinish]);

  if (!shouldRender) return null;

  return (
    <div
      id="mobile-splash-screen"
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setShouldRender(false);
          if (onFinish) onFinish();
        }, 300);
      }}
      className={`fixed inset-0 z-[9999] w-full h-[100dvh] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-out select-none cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambience on Desktop/Tablet */}
      <div
        className="hidden md:block absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110 pointer-events-none"
        style={{ backgroundImage: "url('/splash.png')" }}
      />

      {/* Main Fullscreen Mobile Splash Container */}
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-between items-center overflow-hidden">
        {/* Fullscreen Mobile Splash Image - fits edge-to-edge */}
        <img
          src="/splash.png"
          alt="VDOSKy Splash"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          onError={(e) => {
            // Fallback if needed
            (e.target as HTMLImageElement).src = '/public/splash.png';
          }}
        />

        {/* Subtle top vignette for status bar readability */}
        <div className="relative z-10 w-full pt-4 px-4 flex justify-between items-center bg-gradient-to-b from-black/60 via-black/20 to-transparent">
          <span className="text-[10px] uppercase font-bold tracking-widest text-red-400/90 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-red-500/20">
            VDOSKy Mobile
          </span>
          <span className="text-[10px] text-gray-300/80 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
            Tap to skip
          </span>
        </div>

        {/* Bottom Loading Progress Overlay */}
        <div className="relative z-10 w-full px-6 pb-8 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center">
          {/* Progress bar container */}
          <div className="w-full max-w-xs bg-gray-800/80 rounded-full h-1.5 overflow-hidden border border-red-500/30 backdrop-blur-sm mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full max-w-xs text-[11px] text-gray-300 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>Loading movies &amp; shows...</span>
            </span>
            <span className="font-mono text-red-400 font-bold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
