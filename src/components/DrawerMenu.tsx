import React, { useState, useEffect } from 'react';
import { X, Film, Sparkles, Compass, Clock, Award, Shield, Check, Maximize, Minimize, Smartphone, Music, RefreshCw, Crown } from 'lucide-react';
import { VDOSKyLogo } from './VDOSKyLogo';
import { toggleSystemNavigation } from '../utils/systemBars';
import { CURRENT_APP_VERSION } from '../services/updateService';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenAdConfig?: () => void;
  onOpenMusicSection: () => void;
  onOpenSubscriptionSection?: () => void;
  isSubscribed?: boolean;
  onOpenSplashScreen?: () => void;
  onCheckForUpdate?: () => void;
  isCheckingUpdate?: boolean;
  startIoConfig?: any;
  adStats?: any;
  availableCategories?: { id: string; label: string; count?: number }[];
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  onOpenMusicSection,
  onOpenSubscriptionSection,
  isSubscribed,
  onOpenSplashScreen,
  onCheckForUpdate,
  isCheckingUpdate = false,
  availableCategories
}) => {
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => {
      setIsAppFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  if (!isOpen) return null;

  const toggleAppFullscreen = async () => {
    try {
      await toggleSystemNavigation();
    } catch (err) {
      console.warn('App Fullscreen request failed:', err);
    }
  };

  const defaultCategories: { id: string; label: string; count?: number }[] = [
    { id: 'all', label: 'All Movies (3000+ Titles)' },
    { id: 'bollywood-hindi-movie', label: 'Bollywood Hindi Movies' },
    { id: 'hollywood-hindi-dubbed', label: 'Hollywood Hindi Dubbed' },
    { id: 'bollywood-classic-movie', label: 'Bollywood Classic Movies' },
    { id: 'bollywood-90s-movie', label: 'Bollywood 90s Movies' },
    { id: 'bengali-movie', label: 'Bengali Movies' },
    { id: 'south-indian-hindi', label: 'South Indian Hindi' },
    { id: 'horror-hindi-dubbed', label: 'Horror Hindi Dubbed' },
    { id: 'korean-hindi-dubbed', label: 'Korean Hindi Dubbed' },
    { id: 'tagalog-movie', label: 'Tagalog Movies' },
    { id: 'hollywood-english-dubbed', label: 'Hollywood English Dubbed' },
    { id: 'web-series', label: 'Web Series' }
  ];

  const categories = availableCategories && availableCategories.length > 0
    ? availableCategories
    : defaultCategories;

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-80 max-w-[85vw] bg-[#0d121c] border-r border-gray-800 h-full flex flex-col justify-between z-10 shadow-2xl overflow-y-auto">
        
        {/* Top Header */}
        <div>
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <VDOSKyLogo size={36} />
              <div>
                <h3 className="font-black text-white text-base leading-none">
                  <span className="text-red-500">VDO</span>Sky
                </h3>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Movie Portal &amp; Live Streaming
                </span>
              </div>
            </div>

            <button
              id="btn-close-drawer"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dedicated VIP / Ad-Free Subscription Navigation Button (Top Priority) */}
          {onOpenSubscriptionSection && (
            <div className="mx-3 mb-2.5">
              <button
                id="btn-drawer-open-subscription"
                onClick={() => {
                  onClose();
                  onOpenSubscriptionSection();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-black text-xs transition-all cursor-pointer border-2 active:scale-[0.98] ${
                  isSubscribed
                    ? 'bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white border-emerald-400/80 shadow-lg shadow-emerald-950/60'
                    : 'bg-gradient-to-r from-[#8A0EDF] via-[#9e1beb] to-[#c54bff] text-white border-purple-300 shadow-xl shadow-purple-950/70 hover:brightness-110'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-[#FFD700] fill-current animate-bounce" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black leading-tight flex items-center gap-1.5 text-white">
                      <span>VIP Subscription</span>
                      {isSubscribed ? (
                        <span className="text-[9px] bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-purple-100/90 font-semibold mt-0.5">
                      {isSubscribed ? 'Ad-Free Mode Active 🛡️' : 'Wallet Recharge & 100% No Ads'}
                    </div>
                  </div>
                </div>
                <span className="bg-black/40 text-[11px] font-black px-2.5 py-1 rounded-xl border border-white/30 text-amber-300">
                  {isSubscribed ? 'Active ⭐' : 'Open 👑'}
                </span>
              </button>
            </div>
          )}

          {/* App Fullscreen Mode (Hides mobile top status bar and bottom navigation bar) */}
          <div className="mx-3 mb-2 p-2.5 rounded-xl bg-gray-900/80 border border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gray-800 text-cyan-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Full Screen App</div>
                <div className="text-[10px] text-gray-400">Hide mobile system bars</div>
              </div>
            </div>

            <button
              id="btn-drawer-fullscreen-toggle"
              onClick={toggleAppFullscreen}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                isAppFullscreen
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-gray-800 hover:bg-gray-750 text-gray-200 border-gray-700'
              }`}
            >
              {isAppFullscreen ? (
                <>
                  <Minimize className="w-3 h-3" />
                  <span>ON</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3 h-3 text-red-400" />
                  <span>OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Dedicated Music Section Navigation Button */}
          <div className="mx-3 mb-2">
            <button
              id="btn-drawer-open-music"
              onClick={() => {
                onClose();
                onOpenMusicSection();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#ff3b30] to-[#b71c1c] text-white font-black text-xs shadow-lg shadow-red-950/50 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border border-red-400/50"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-black/35 flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black leading-tight">Music Section</div>
                  <div className="text-[10px] text-red-100 font-medium">Online Songs &amp; Player</div>
                </div>
              </div>
              <span className="bg-black/30 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                Play 🎵
              </span>
            </button>
          </div>

          {/* Fullscreen Mobile Splash Screen Preview Button */}
          {onOpenSplashScreen && (
            <div className="mx-3 mb-2">
              <button
                id="btn-drawer-preview-splash"
                onClick={() => {
                  onClose();
                  onOpenSplashScreen();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-200 text-xs font-bold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-600/20 text-red-400 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                    🎬
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Splash Screen</div>
                    <div className="text-[10px] text-gray-400">View mobile full screen splash</div>
                  </div>
                </div>
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-semibold">
                  Preview
                </span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="p-3">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">
              Movie Categories
            </div>

            <nav className="space-y-1">
              {categories.map((cat) => {
                const Icon = (cat as any).icon || Film;
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    id={`menu-cat-${cat.id}`}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-red-400'}`} />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cat.count !== undefined && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-black/20 text-white font-extrabold' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {cat.count}
                        </span>
                      )}
                      {isActive && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* App Version & Check for Update */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-900/90 border border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Current Version</div>
            <div className="text-xs font-black text-white">v{CURRENT_APP_VERSION}</div>
          </div>
          {onCheckForUpdate && (
            <button
              id="btn-check-update"
              onClick={onCheckForUpdate}
              disabled={isCheckingUpdate}
              className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Checking...' : 'Check Update'}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800/80 bg-[#090d14] text-center">
          <p className="text-[11px] text-gray-400">
            VDOSKy Mobile &amp; TV Stream Engine
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Start.io Monetization · Native · 300x250 Banner · Rewarded Video
          </p>
        </div>

      </div>
    </div>
  );
};
