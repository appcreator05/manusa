import React, { useState, useEffect } from 'react';

interface VDOSKyLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const VDOSKyLogo: React.FC<VDOSKyLogoProps> = ({
  className = '',
  size = 36,
  showText = false
}) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    try {
      const custom = localStorage.getItem('vdosky_custom_logo');
      if (custom) return custom;
    } catch {}
    return '/logo.png';
  });

  const [imgErrorCount, setImgErrorCount] = useState(0);

  const handleImageError = () => {
    if (imgErrorCount === 0) {
      setLogoSrc('/logo.jpg');
      setImgErrorCount(1);
    } else if (imgErrorCount === 1) {
      setLogoSrc('/logo.svg');
      setImgErrorCount(2);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative shrink-0 flex items-center justify-center rounded-full overflow-hidden shadow-lg shadow-red-950/50 ring-2 ring-red-500/50 bg-black hover:scale-105 transition-transform"
      >
        <img
          src={logoSrc}
          alt="VDOSKy Logo"
          onError={handleImageError}
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-0.5 font-sans">
            <span className="text-red-500">VDO</span>
            <span className="text-cyan-400">SKy</span>
          </span>
          <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
            HD MOVIES
          </span>
        </div>
      )}
    </div>
  );
};
