import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { STARTIO_REAL_CAMPAIGNS } from '../data/movies';
import { reportStartIoInteraction } from '../utils/startIoAndroidBridge';

interface StartIoBannerAdProps {
  position?: 'bottom' | 'top';
  appId: string;
  onAdClick?: () => void;
  onAdImpression?: () => void;
  customAdUrl?: string;
}

export const StartIoBannerAd: React.FC<StartIoBannerAdProps> = ({
  position = 'bottom',
  appId,
  onAdClick,
  onAdImpression,
  customAdUrl
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const onAdImpressionRef = React.useRef(onAdImpression);

  useEffect(() => {
    onAdImpressionRef.current = onAdImpression;
  }, [onAdImpression]);

  useEffect(() => {
    onAdImpressionRef.current?.();
    reportStartIoInteraction('impression', `banner-${position}`);
    const interval = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % STARTIO_REAL_CAMPAIGNS.length);
      onAdImpressionRef.current?.();
      reportStartIoInteraction('impression', `banner-${position}`);
    }, 18000);
    return () => clearInterval(interval);
  }, [position]);

  if (!isVisible) return null;

  const currentAd = STARTIO_REAL_CAMPAIGNS[activeAdIndex] || STARTIO_REAL_CAMPAIGNS[0];
  const targetUrl = customAdUrl?.trim() || currentAd.ctaUrl;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    reportStartIoInteraction('click', `banner-${position}`);
    onAdClick?.();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="startio-banner-container"
      className={`fixed ${position === 'bottom' ? 'bottom-0' : 'top-14'} left-0 right-0 z-40 bg-[#0c101a]/95 backdrop-blur-md border-t border-gray-800 shadow-2xl py-1.5 px-3`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Ad badge & Content */}
        <div
          onClick={handleClick}
          className="flex-1 flex items-center gap-2.5 cursor-pointer overflow-hidden group"
        >
          <img
            src={currentAd.icon}
            alt={currentAd.title}
            className="w-10 h-10 rounded-xl object-cover border border-gray-700 shrink-0 group-hover:scale-105 transition-transform"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider border border-amber-500/30">
                AD
              </span>
              <span className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                {currentAd.title}
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:inline truncate">
                ★ {currentAd.rating} ({currentAd.reviewsCount})
              </span>
            </div>
            <p className="text-[11px] text-gray-300 truncate hidden xs:block">
              {currentAd.description}
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 bg-red-600 group-hover:bg-red-500 text-white font-black text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-red-950/40"
          >
            <span>{currentAd.ctaText}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Close banner */}
        <button
          id="btn-close-banner-ad"
          type="button"
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors shrink-0 cursor-pointer"
          title="Dismiss ad"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
