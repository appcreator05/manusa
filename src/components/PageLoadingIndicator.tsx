import React from 'react';
import { VDOSKyLogo } from './VDOSKyLogo';

interface PageLoadingIndicatorProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const PageLoadingIndicator: React.FC<PageLoadingIndicatorProps> = ({
  message = 'Loading content...',
  subMessage = 'Please wait a moment',
  fullScreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
      {/* Glowing pulsing VDOSKy Logo Spinner */}
      <div className="relative flex items-center justify-center mb-5">
        {/* Outer glowing ring */}
        <div className="w-20 h-20 rounded-full border-4 border-red-500/20 border-t-red-500 border-r-cyan-400 animate-spin" />
        
        {/* Middle pulsing glow */}
        <div className="absolute w-16 h-16 rounded-full bg-red-600/20 animate-ping opacity-75" />
        
        {/* Center Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <VDOSKyLogo size={42} />
        </div>
      </div>

      {/* Text message */}
      <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
        <span>{message}</span>
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </h3>

      {subMessage && (
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          {subMessage}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0b0e14]/90 backdrop-blur-md flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full py-16 flex items-center justify-center">
      {content}
    </div>
  );
};

export const TopProgressBar: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  if (!isAnimating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-cyan-400 animate-pulse shadow-[0_0_12px_#ef4444] w-full" />
    </div>
  );
};
