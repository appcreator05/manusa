import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Movie } from '../types';
import { CachedImage } from './CachedImage';
import { useNearScreen } from '../hooks/useNearScreen';

interface MovieCardProps {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  priority?: boolean;
  layout?: 'grid' | 'carousel';
  isClicked?: boolean;
}

const MovieCardComponent: React.FC<MovieCardProps> = ({
  movie,
  onSelectMovie,
  priority = false,
  layout = 'carousel',
  isClicked = false,
}) => {
  const [cardRef, isNearScreen] = useNearScreen<HTMLDivElement>('500px');
  const [retryStage, setRetryStage] = useState<number>(0);
  const [localClicked, setLocalClicked] = useState(false);

  // Should we render the image? True if priority, or if within 500px of screen
  const shouldLoadImage = priority || isNearScreen;

  // Reset local clicked state
  useEffect(() => {
    if (localClicked && !isClicked) {
      const timer = setTimeout(() => setLocalClicked(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [localClicked, isClicked]);

  // Compute poster with fallback cascade
  let posterUrl = movie.poster;
  if (retryStage === 1 && movie.poster.includes('cdn.jsdelivr.net/gh/appcreator05/post@main/')) {
    posterUrl = movie.poster.replace(
      'cdn.jsdelivr.net/gh/appcreator05/post@main/',
      'raw.githubusercontent.com/appcreator05/post/main/'
    );
  } else if (retryStage >= 2) {
    posterUrl = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=75';
  }

  const handleImgError = () => {
    setRetryStage((prev) => prev + 1);
  };

  const handleClick = () => {
    setLocalClicked(true);
    onSelectMovie(movie);
  };

  const showActivePlayFeedback = localClicked || isClicked;

  return (
    <div
      ref={cardRef}
      id={`movie-card-${movie.id}`}
      onClick={handleClick}
      className={`${
        layout === 'grid'
          ? 'w-full'
          : 'w-36 sm:w-44 md:w-48 shrink-0'
      } flex flex-col cursor-pointer group select-none transform-gpu active:scale-[0.98] transition-transform duration-150 movie-card-contain`}
    >
      {/* Poster Container with 500px Ahead-of-Time Lazy Loading */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141824] border border-gray-800/80 group-hover:border-cyan-500/80 transition-all duration-200">
        {shouldLoadImage ? (
          <CachedImage
            src={posterUrl}
            alt={movie.title}
            referrerPolicy="no-referrer"
            loading={priority ? 'eager' : 'lazy'}
            onError={handleImgError}
            className="w-full h-full object-cover group-hover:brightness-105 transition-transform duration-300"
          />
        ) : (
          /* Zero-overhead lightweight skeleton when > 500px away */
          <div className="w-full h-full bg-[#141824] flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-gray-800/50" />
          </div>
        )}

        {/* Rating Badge: Top Right, GPU-friendly solid backdrop */}
        <div className="absolute top-2 right-2 bg-black/90 border border-amber-400/80 text-amber-400 text-[11px] sm:text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
          <span className="text-amber-400">★</span>
          <span>{movie.rating}</span>
        </div>

        {/* HD Quality Tag */}
        <div className="absolute top-2 left-2 bg-black/85 text-[9px] font-bold text-gray-200 px-1.5 py-0.5 rounded border border-gray-700 z-10">
          HD
        </div>

        {/* Instant Central Play Icon Feedback on Click/Tap */}
        {showActivePlayFeedback ? (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-20 animate-fadeIn">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-16 h-16 rounded-full bg-red-600/40 animate-ping" />
              <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,1)] border-2 border-white transform scale-110">
                <Play className="w-7 h-7 fill-white translate-x-0.5" />
              </div>
            </div>
            <div className="mt-2.5 px-3 py-0.5 rounded-full bg-red-950 border border-red-500/70 text-[11px] font-black tracking-wider text-red-200 uppercase shadow-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span>Playing...</span>
            </div>
          </div>
        ) : (
          /* Desktop Hover Play Button Overlay */
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Title Below */}
      <div className="mt-2 px-1">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-200 group-hover:text-cyan-400 truncate leading-tight transition-colors">
          {movie.title}
        </h3>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">
          {movie.year} · {movie.genres[0] || 'HD'}
        </p>
      </div>
    </div>
  );
};

export const MovieCard = React.memo(MovieCardComponent);
