import React, { useState } from 'react';
import { Menu, Mic, X, Music } from 'lucide-react';
import { StartIoConfig, AdStats } from '../types';
import { VoiceSearchModal } from './VoiceSearchModal';
import { VDOSKyLogo } from './VDOSKyLogo';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenMusicSection?: () => void;
  onOpenAdConfig?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startIoConfig?: StartIoConfig;
  adStats?: AdStats;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  onOpenMusicSection,
  searchQuery,
  onSearchChange,
  onLogoClick,
}) => {
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-gray-800/80 px-2.5 py-2 sm:px-6 sm:py-3 pt-[calc(0.5rem+env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Logo & Menu & Music Toggles */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              id="btn-header-logo"
              onClick={onLogoClick}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
              title="VDOSKy Home"
            >
              <VDOSKyLogo size={32} showText={false} />
            </button>

            <button
              id="btn-menu-toggle"
              onClick={onOpenMenu}
              className="flex items-center gap-1.5 bg-[#00b4d8] hover:bg-[#0096c7] active:scale-95 text-black font-extrabold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all shadow-md cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
              <span className="text-xs sm:text-sm font-black tracking-wide">Menu</span>
            </button>

            {onOpenMusicSection && (
              <button
                id="btn-header-music"
                onClick={onOpenMusicSection}
                className="flex items-center gap-1 bg-[#ff3b30] hover:bg-red-600 active:scale-95 text-white font-black px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all shadow-md cursor-pointer text-xs sm:text-sm"
                title="Open Music Section"
              >
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Music</span>
              </button>
            )}
          </div>

          {/* Center/Full Search Bar */}
          <div className="flex-1 max-w-2xl relative flex items-center">
            <div className="w-full flex items-center bg-[#151922] hover:bg-[#1a202c] focus-within:bg-[#1a202c] border border-gray-700/60 focus-within:border-red-500/80 rounded-xl px-2.5 sm:px-3.5 py-1.5 transition-all shadow-inner">
              <button
                id="btn-voice-search"
                onClick={() => setShowVoiceModal(true)}
                className="p-1 text-gray-400 hover:text-red-500 active:scale-90 transition-all shrink-0 cursor-pointer"
                title="Voice Search (Bengali, Hindi, English)"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                id="input-movie-search"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, actors, genres..."
                className="w-full bg-transparent text-xs sm:text-sm text-gray-100 placeholder-gray-400 px-2.5 py-0.5 focus:outline-none"
              />

              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => onSearchChange('')}
                  className="p-1 text-gray-400 hover:text-gray-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Interactive Voice Search Modal with Speech Recognition */}
      <VoiceSearchModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onApplySearch={(query) => {
          onSearchChange(query);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
};
