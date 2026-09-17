import { Movie } from '../types';
import { SAMPLE_MOVIES } from '../data/movies';
import { getFullMovieCatalog, formatCategory, parseMovieItem } from '../data/movieCatalog';

// The User's GitHub raw JSON URLs
export const USER_JSON_URL = 'https://raw.githubusercontent.com/appcreator05/post/refs/heads/main/8468988.json';
export const USER_SONGS_JSON_URL = 'https://raw.githubusercontent.com/appcreator05/post/refs/heads/main/6766846.json';

// Seed catalog containing all 855 user movies + 476 song albums
export const SEED_CATALOG_MOVIES: Movie[] = getFullMovieCatalog();

export interface RawRemoteMovie {
  id?: string | number;
  title?: string;
  name?: string;
  movie?: string;
  poster?: string;
  poster_url?: string;
  image?: string;
  backdrop?: string;
  banner?: string;
  rating?: string | number;
  year?: string | number;
  duration?: string;
  time?: string;
  category?: string;
  categoryLabel?: string;
  genres?: string[] | string;
  genre?: string[] | string;
  description?: string;
  desc?: string;
  story?: string;
  cast?: string[] | string;
  director?: string;
  audioLanguages?: string[] | string;
  audio?: string[] | string;
  video?: string;
  yt?: string;
  drc?: string;
  videoUrl?: string;
  streamUrl?: string;
  url?: string;
  songs?: Array<{ title?: string; id?: string }>;
  streamServers?: Array<{ name: string; quality: string; url: string }>;
  downloadLinks?: Array<{ quality: string; size: string; resolution: string; url: string }>;
  isFeatured?: boolean;
}

export const SEED_MOVIES: RawRemoteMovie[] = SAMPLE_MOVIES as unknown as RawRemoteMovie[];

export function isMusicItem(movie: Movie): boolean {
  if (!movie) return false;
  if (movie.id && movie.id.startsWith('song-album-')) return true;

  const cat = (movie.category || '').toLowerCase();
  const label = (movie.categoryLabel || '').toLowerCase();
  const title = (movie.title || '').toLowerCase();

  if (
    cat.includes('music') ||
    cat.includes('song') ||
    cat.includes('album') ||
    cat.includes('bhakti-sangeet') ||
    cat.includes('mp3')
  ) {
    return true;
  }

  if (
    label.includes('music') ||
    label.includes('song') ||
    label.includes('album') ||
    label.includes('sangeet') ||
    label.includes('mp3')
  ) {
    return true;
  }

  if (movie.genres && movie.genres.some((g) => {
    const gl = g.toLowerCase();
    return gl === 'music' || gl === 'bollywood mp3' || gl === 'songs';
  })) {
    return true;
  }

  return false;
}

export function sanitizeCategory(cat?: string): { slug: string; label: string } {
  return formatCategory(cat);
}

export function transformRawMovie(raw: RawRemoteMovie, index: number): Movie {
  return parseMovieItem(
    {
      id: raw.id ? String(raw.id) : undefined,
      title: raw.title || raw.name || raw.movie,
      category: raw.category || raw.categoryLabel,
      poster: raw.poster || raw.poster_url || raw.image,
      rating: raw.rating ? String(raw.rating) : '4.8',
      video: raw.video || raw.videoUrl || raw.streamUrl || raw.url,
      yt: raw.yt,
      drc: raw.drc,
      cast: typeof raw.cast === 'string' ? raw.cast : Array.isArray(raw.cast) ? raw.cast.join(', ') : undefined
    },
    index
  );
}

export async function fetchMoviesFromRemote(url: string = USER_JSON_URL): Promise<Movie[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const liveUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const response = await fetch(liveUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let rawList: RawRemoteMovie[] = [];

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.movies)) {
        rawList = data.movies;
      } else if (Array.isArray(data.posts)) {
        rawList = data.posts;
      } else if (Array.isArray(data.data)) {
        rawList = data.data;
      } else if (Array.isArray(data.items)) {
        rawList = data.items;
      } else {
        const candidate = Object.values(data).find((val) => Array.isArray(val));
        if (candidate) {
          rawList = candidate as RawRemoteMovie[];
        }
      }
    }

    if (rawList.length === 0) {
      return SEED_CATALOG_MOVIES;
    }

    // Transform live items from user's GitHub
    const liveMovies = rawList.map((item, idx) => transformRawMovie(item, idx));

    // Return only movies (pure movie catalog without music/song sections)
    if (liveMovies.length > 0) {
      return liveMovies.filter((m) => !isMusicItem(m));
    }

    return SEED_CATALOG_MOVIES.filter((m) => !isMusicItem(m));
  } catch (err) {
    console.warn('Could not load remote movies from GitHub, using preloaded user database:', err);
    return SEED_CATALOG_MOVIES.filter((m) => !isMusicItem(m));
  }
}
