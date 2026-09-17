import React, { useEffect } from 'react';
import { ExternalLink, Download, Star, Sparkles, Tag, ArrowRight, ShieldCheck } from 'lucide-react';
import { AdCreative } from '../types';
import { START_IO_ADS } from '../data/movies';
import { reportStartIoInteraction } from '../utils/startIoAndroidBridge';

interface StartIoNativeAdProps {
  variant?: 'card' | 'banner-row' | 'player-inline' | 'mrec-300x250' | 'mrec-300x250-native' | 'mrec-300x250-banner';
  adIndex?: number;
  onAdClick?: () => void;
}

export const StartIoNativeAd: React.FC<StartIoNativeAdProps> = ({
  variant = 'card',
  adIndex = 0,
  onAdClick
}) => {
  const ad: AdCreative = START_IO_ADS[adIndex % START_IO_ADS.length];

  // Report impression to Start.io native Android SDK when ad renders
  useEffect(() => {
    reportStartIoInteraction('impression', `native-${variant}-${ad.id}`);
  }, [variant, ad.id]);

  const handleClick = () => {
    reportStartIoInteraction('click', `native-${variant}-${ad.id}`);
    onAdClick?.();
    window.open(ad.ctaUrl, '_blank', 'noopener,noreferrer');
  };

  // Determine whether to show Native or Banner when 'mrec-300x250' is selected:
  // Alternates: even index -> 300x250 Native Ad, odd index -> 300x250 Banner Ad
  const isMrecBanner =
    variant === 'mrec-300x250-banner' || (variant === 'mrec-300x250' && adIndex % 2 === 1);

  // 1. 300x250 DISPLAY BANNER AD (Alternating variant: High-impact display banner)
  if (isMrecBanner) {
    return (
      <div
        id={`startio-banner-300x250-${ad.id}`}
        onClick={handleClick}
        style={{ width: '300px', height: '250px' }}
        className="w-[300px] h-[250px] relative rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/50 hover:border-amber-400 cursor-pointer group select-none transition-all duration-300 hover:scale-[1.01]"
      >
        {/* Full-bleed Campaign Background Creative */}
        <img
          src={ad.mediaImage}
          alt={ad.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
        />

        {/* High-contrast Vignette / Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 flex flex-col justify-between p-3.5" />

        {/* Top Header Row of 300x250 Banner */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="bg-amber-500 text-black font-black text-[9px] tracking-wider px-2 py-0.5 rounded shadow flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 fill-black" />
            <span>BANNER AD · START.IO</span>
          </span>
          <span className="bg-black/80 backdrop-blur-sm border border-amber-500/60 text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400" />
            {ad.rating.toFixed(1)}
          </span>
        </div>

        {/* Center Deal / Promotional Highlight */}
        <div className="relative z-10 my-auto text-center px-1">
          <div className="inline-flex items-center gap-1 bg-red-600/90 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-md mb-1 shadow">
            <Tag className="w-2.5 h-2.5" />
            <span>Featured Deal · 300x250</span>
          </div>
          <h3 className="text-base font-black text-white drop-shadow-md group-hover:text-amber-300 transition-colors line-clamp-1">
            {ad.title}
          </h3>
          <p className="text-[11px] text-gray-200 drop-shadow line-clamp-2 mt-0.5 font-medium leading-tight">
            {ad.tagline || ad.description}
          </p>
        </div>

        {/* Bottom CTA Banner Button */}
        <div className="relative z-10 mt-auto">
          <button className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs py-2 px-3 rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-1.5 transition-all group-hover:shadow-amber-500/50 cursor-pointer">
            <span>{ad.ctaText}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </button>
          <div className="flex items-center justify-between text-[9px] text-gray-400 mt-1 px-1">
            <span>Verified Sponsor · Start.io</span>
            <span>300 × 250 MREC</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. 300x250 RICH NATIVE AD (Redesigned to fill the entire card with visual media + icon + CTA)
  if (variant === 'mrec-300x250' || variant === 'mrec-300x250-native') {
    return (
      <div
        id={`startio-native-mrec-${ad.id}`}
        onClick={handleClick}
        style={{ width: '300px', height: '250px' }}
        className="w-[300px] h-[250px] bg-[#0e1420] border-2 border-cyan-500/40 hover:border-cyan-400 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl cursor-pointer group select-none transition-all duration-300 hover:scale-[1.01]"
      >
        {/* Top Half: Rich Media Image Visual (Height: ~120px) */}
        <div className="relative w-full h-[120px] shrink-0 overflow-hidden bg-gray-900">
          <img
            src={ad.mediaImage}
            alt={ad.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1420] via-transparent to-black/50" />

          {/* Top-Left Sponsor Chip */}
          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm border border-cyan-500/60 text-cyan-300 text-[9px] font-black tracking-wider px-2 py-0.5 rounded">
            NATIVE AD · START.IO
          </div>

          {/* Top-Right Rating Badge */}
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-amber-500/60 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{ad.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Bottom Half: App Icon, Metadata & CTA (Height: ~130px) */}
        <div className="flex-1 p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={ad.icon}
              alt={ad.title}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-white group-hover:text-cyan-400 truncate leading-tight">
                {ad.title}
              </h4>
              <p className="text-[10px] text-cyan-300 font-semibold truncate mt-0.5">
                {ad.appCategory} {ad.installs && `· ${ad.installs}`}
              </p>
              <p className="text-[10px] text-gray-300 line-clamp-1 mt-0.5">
                {ad.description}
              </p>
            </div>
          </div>

          <div className="mt-1.5">
            <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 group-hover:from-cyan-400 group-hover:to-blue-500 text-white font-black text-xs py-1.5 px-3 rounded-xl transition-all shadow-md shadow-cyan-500/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{ad.ctaText}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. CARD VARIANT (Used inside horizontal category row)
  if (variant === 'card') {
    return (
      <div
        id={`startio-native-card-${ad.id}`}
        onClick={handleClick}
        className="w-36 sm:w-44 md:w-48 shrink-0 flex flex-col cursor-pointer group select-none relative"
      >
        {/* Card Poster Container matching movie card */}
        <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#151922] border-2 border-cyan-500/40 group-hover:border-cyan-400 transition-all duration-300 group-hover:scale-[1.02] shadow-lg shadow-cyan-950/20">
          <img
            src={ad.mediaImage}
            alt={ad.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
          />

          {/* Top Left: Sponsored Badge */}
          <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-sm border border-cyan-400/50 text-cyan-300 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md">
            AD · START.IO
          </div>

          {/* Top Right Rating Badge */}
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-amber-500/60 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <span>★</span>
            <span>{ad.rating.toFixed(1)}</span>
          </div>

          {/* Bottom Overlay Gradient with Install Action */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-6 flex flex-col justify-end">
            <div className="flex items-center gap-1 text-[10px] text-gray-300 font-semibold mb-1">
              <span className="truncate">{ad.appCategory}</span>
              {ad.installs && <span>· {ad.installs}</span>}
            </div>
            <button className="w-full bg-[#00b4d8] group-hover:bg-[#0096c7] text-black text-xs font-black py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow">
              <Download className="w-3 h-3 stroke-[2.5]" />
              <span>{ad.ctaText}</span>
            </button>
          </div>
        </div>

        {/* Title Below */}
        <div className="mt-2 px-1">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-cyan-400 truncate leading-tight">
            {ad.title}
          </h3>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            Sponsored by Start.io
          </p>
        </div>
      </div>
    );
  }

  // 4. PLAYER INLINE VARIANT
  if (variant === 'player-inline') {
    return (
      <div
        id={`startio-native-player-${ad.id}`}
        onClick={handleClick}
        className="my-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#111827] via-[#141d2e] to-[#0f172a] border border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer shadow-lg"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <img
              src={ad.icon}
              alt={ad.title}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover border border-cyan-500/40 shrink-0 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sponsored · Start.io Ad
                </span>
                <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {ad.rating} ({ad.reviewsCount})
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white hover:text-cyan-400 transition-colors">
                {ad.title}
              </h4>
              <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">
                {ad.description}
              </p>
            </div>
          </div>

          <button className="bg-[#00b4d8] hover:bg-[#0096c7] text-black font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 self-end sm:self-center shadow-md">
            <span>{ad.ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 5. BANNER ROW VARIANT
  return (
    <div
      id={`startio-native-row-${ad.id}`}
      onClick={handleClick}
      className="my-6 p-4 rounded-2xl bg-[#111724] border border-cyan-900/40 hover:border-cyan-500/50 transition-all cursor-pointer shadow-xl relative overflow-hidden group"
    >
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-60 h-32 md:h-36 shrink-0 rounded-xl overflow-hidden border border-gray-800">
          <img
            src={ad.mediaImage}
            alt={ad.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 bg-black/80 text-cyan-300 border border-cyan-500/50 text-[10px] font-bold px-2 py-0.5 rounded">
            AD · Start.io
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-gray-400">
              {ad.advertiser}
            </span>
            <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {ad.rating} ({ad.reviewsCount})
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
            {ad.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 line-clamp-2">
            {ad.description}
          </p>

          <div className="mt-3 flex items-center gap-3">
            <button className="bg-[#00b4d8] group-hover:bg-[#0096c7] text-black font-extrabold text-xs sm:text-sm px-5 py-2 rounded-xl transition-all shadow flex items-center gap-2">
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{ad.ctaText}</span>
            </button>
            <span className="text-xs text-gray-400">
              Verified by Start.io Safety Network
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
