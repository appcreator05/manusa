import React, { useState, useEffect } from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import { openUrlInChrome } from '../utils/startIoAndroidBridge';
import { hideSystemNavigation } from '../utils/systemBars';

interface SmartlinkInterstitialAdProps {
  isOpen: boolean;
  onClose: () => void;
  smartlinkUrl?: string;
  wasFullscreen?: boolean;
}

export const SMARTLINK_DEFAULT_URL = "https://www.profitableratecpmnetwork.com/yjtnajfd?key=cc49d62c781de224c118e83dc6c2ea8f";

export const SmartlinkInterstitialAd: React.FC<SmartlinkInterstitialAdProps> = ({
  isOpen,
  onClose,
  smartlinkUrl = SMARTLINK_DEFAULT_URL,
  wasFullscreen = false,
}) => {
  const [countdown, setCountdown] = useState(15);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Exit any native fullscreen (especially YouTube iframe) so modal is 100% visible on top
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      } catch {}
    }

    // Pause any playing YouTube iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((ifr) => {
      try {
        if (ifr.src && (ifr.src.includes('youtube.com') || ifr.src.includes('youtube-nocookie.com')) && ifr.contentWindow) {
          ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        }
      } catch {}
    });

    setCountdown(15);
    setCanSkip(false);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkipOrClose = async () => {
    // Resume any paused YouTube iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((ifr) => {
      try {
        if (ifr.src && (ifr.src.includes('youtube.com') || ifr.src.includes('youtube-nocookie.com')) && ifr.contentWindow) {
          ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
      } catch {}
    });

    // If user was watching video in landscape fullscreen, immediately restore landscape lock and fullscreen
    if (wasFullscreen) {
      await hideSystemNavigation().catch(() => {});

      try {
        if ((window as any).Android && typeof (window as any).Android.setLandscape === 'function') {
          (window as any).Android.setLandscape();
        }
      } catch {}

      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}

      try {
        const docEl = document.documentElement;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen({ navigationUI: 'hide' as const }).catch(() => {});
          } else if ((docEl as any).webkitRequestFullscreen) {
            await (docEl as any).webkitRequestFullscreen().catch(() => {});
          }
        }
      } catch {}
    }

    onClose();
  };

  const handleOpenInChrome = () => {
    openUrlInChrome(smartlinkUrl);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/95 flex flex-col justify-between backdrop-blur-md animate-fadeIn">
      {/* Top Control Bar with Open in Chrome and Skip Ad button */}
      <div className="w-full bg-[#111622]/95 border-b border-gray-800 px-3 sm:px-6 py-2.5 flex items-center justify-end gap-2 shadow-xl shrink-0">
        <div className="flex items-center gap-2">
          {/* Open in Chrome button */}
          <button
            onClick={handleOpenInChrome}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in</span> Chrome
          </button>

          {/* Skip Ad Button */}
          <button
            onClick={handleSkipOrClose}
            disabled={!canSkip}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all shadow-md ${
              canSkip
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 ring-2 ring-emerald-400/50 animate-pulse'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            {canSkip ? (
              <>Skip Ad</>
            ) : (
              <>
                <Lock className="w-3 h-3 text-gray-400" />
                <span>{countdown}s</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Smartlink Ad Iframe Body */}
      <div className="flex-1 w-full relative bg-[#0a0d14] overflow-hidden">
        <iframe
          src={smartlinkUrl}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          scrolling="yes"
          loading="lazy"
          title="Sponsored Interstitial"
        />
      </div>

      {/* Bottom Action Bar (Tap to open in Chrome) */}
      <div
        onClick={handleOpenInChrome}
        className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs sm:text-sm font-black py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-[0.99] shrink-0"
      >
        <span>Tap here to open in Chrome app</span>
        <ExternalLink className="w-4 h-4" />
      </div>
    </div>
  );
};
