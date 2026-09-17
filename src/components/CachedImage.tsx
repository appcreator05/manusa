import React, { useState, useEffect } from 'react';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

/**
 * Ultra-lightweight zero-RAM overhead image component.
 * Uses native browser HTTP disk cache and decoding="async" to prevent CPU/RAM lag on low-end devices.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className = '',
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  onError,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasFailed(false);
  }, [src]);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasFailed && fallbackSrc) {
      setHasFailed(true);
      setCurrentSrc(fallbackSrc);
    }
    onError?.(e);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      referrerPolicy={referrerPolicy}
      decoding="async"
      onError={handleImgError}
      className={className}
      {...props}
    />
  );
};
