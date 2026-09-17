import { Movie } from '../types';
import rawMoviesData from './userCatalog8468988.json';
import rawSongsData from './userCatalog6766846.json';
import { resolvePostVideoSource } from '../utils/videoSourceResolver';

export interface UserRawMovie {
  id?: string;
  title?: string;
  category?: string;
  poster?: string;
  rating?: string;
  video?: string;
  yt?: string;
  drc?: string;
  cast?: string;
}

export interface UserRawSongAlbum {
  category?: string;
  movie?: string;
  poster?: string;
  songs?: Array<{ title?: string; id?: string }>;
}

export function formatCategory(cat?: string): { slug: string; label: string } {
  if (!cat || typeof cat !== 'string' || cat.trim() === '') {
    return { slug: 'bollywood-hindi-movie', label: 'Bollywood Hindi Movies' };
  }

  const clean = cat.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('bengali') || lower.includes('bangla')) {
    if (lower.includes('mp3') || lower.includes('song') || lower.includes('album')) {
      return { slug: 'bengali-mp3', label: 'Bengali Mp3 & Songs' };
    }
    return { slug: 'bengali-movie', label: 'Bengali Movies' };
  }
  if (lower.includes('hollywood') && lower.includes('hindi')) {
    return { slug: 'hollywood-hindi-dubbed', label: 'Hollywood Hindi Dubbed' };
  }
  if (lower.includes('hollywood') && (lower.includes('english') || lower.includes('dubbed'))) {
    return { slug: 'hollywood-english-dubbed', label: 'Hollywood English Dubbed' };
  }
  if (lower.includes('classic')) {
    if (lower.includes('song')) {
      return { slug: 'hindi-classic-songs', label: 'Hindi Classic Songs' };
    }
    return { slug: 'bollywood-classic-movie', label: 'Bollywood Classic Movies' };
  }
  if (lower.includes('90s') || lower.includes("90's")) {
    if (lower.includes('song')) {
      return { slug: 'hindi-90s-songs', label: 'Hindi 90s Songs' };
    }
    return { slug: 'bollywood-90s-movie', label: 'Bollywood 90s Movies' };
  }
  if (lower.includes('80s') || lower.includes("80's")) {
    return { slug: 'hindi-80s-songs', label: 'Hindi 80s Songs' };
  }
  if (lower.includes('south') || lower.includes('tamil') || lower.includes('telugu')) {
    if (lower.includes('song')) {
      return { slug: 'south-songs', label: 'South Indian Songs' };
    }
    return { slug: 'south-indian-hindi', label: 'South Indian Hindi Movies' };
  }
  if (lower.includes('horror')) {
    return { slug: 'horror-hindi-dubbed', label: 'Horror Hindi Dubbed' };
  }
  if (lower.includes('korean')) {
    return { slug: 'korean-hindi-dubbed', label: 'Korean Hindi Dubbed' };
  }
  if (lower.includes('tagalog')) {
    return { slug: 'tagalog-movie', label: 'Tagalog Movies' };
  }
  if (lower.includes('cartoon') || lower.includes('animation')) {
    return { slug: 'cartoon-movie', label: 'Cartoon & Animated Movies' };
  }
  if (lower.includes('bhojpuri')) {
    if (lower.includes('song')) {
      return { slug: 'bhojpuri-songs', label: 'Bhojpuri Songs' };
    }
    return { slug: 'bhojpuri-movie', label: 'Bhojpuri Movies' };
  }
  if (lower.includes('bhakti')) {
    if (lower.includes('song') || lower.includes('sangeet')) {
      return { slug: 'bhakti-sangeet', label: 'Bhakti Sangeet & Bhajans' };
    }
    return { slug: 'bhakti-movie', label: 'Bhakti & Devotional Movies' };
  }
  if (lower.includes('marathi')) {
    return { slug: 'marathi-movie', label: 'Marathi Movies' };
  }
  if (lower.includes('web series') || lower.includes('series')) {
    return { slug: 'web-series', label: 'Web Series' };
  }
  if (lower.includes('song') || lower.includes('album') || lower.includes('music')) {
    return { slug: 'hindi-songs', label: 'Hindi Songs & Albums' };
  }
  if (lower.includes('bollywood') || lower.includes('hindi')) {
    return { slug: 'bollywood-hindi-movie', label: 'Bollywood Hindi Movies' };
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { slug, label: clean };
}

export function parseMovieItem(raw: UserRawMovie, index: number): Movie {
  const title = (raw.title || `Movie #${index + 1}`).trim();
  const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2024;

  const { slug, label } = formatCategory(raw.category);

  // Generate completely unique ID to prevent React key or selection collisions
  const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const id = `post-${index + 1}-${cleanSlug}`;

  // Poster with fallback check
  const poster = raw.poster && raw.poster.trim() !== ''
    ? raw.poster.trim()
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';

  const backdrop = poster;
  const rating = raw.rating && raw.rating.trim() !== '' ? raw.rating.trim() : '4.8';
  const duration = year < 2000 ? '2h 35m' : '2h 15m';

  const castList = raw.cast
    ? raw.cast.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Popular Cast', 'All Star Cast'];

  // Check and resolve video source ("video", "yt", or "drc")
  const resolved = resolvePostVideoSource(raw);
  const videoUrl = resolved.playerUrl;
  const videoType = resolved.type;
  const videoId = resolved.id;
  const driveId = resolved.type === 'video' ? resolved.id : '';

  const streamServers = resolved.servers;

  const downloadLinks = driveId
    ? [
        { quality: '1080p Full HD', size: '2.2 GB', resolution: '1920x1080', url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}` },
        { quality: '720p HD Ready', size: '1.2 GB', resolution: '1280x720', url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}` },
        { quality: '480p Mobile Quality', size: '480 MB', resolution: '854x480', url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}` }
      ]
    : [
        { quality: '1080p Full HD', size: '2.1 GB', resolution: '1920x1080', url: resolved.type === 'drc' ? resolved.rawUrl : '#' },
        { quality: '720p HD Ready', size: '1.1 GB', resolution: '1280x720', url: resolved.type === 'drc' ? resolved.rawUrl : '#' },
        { quality: '480p Mobile Quality', size: '480 MB', resolution: '854x480', url: resolved.type === 'drc' ? resolved.rawUrl : '#' }
      ];

  const genres = [label.replace(' Movies', '').replace(' Dubbed', ''), 'HD Entertainment'];

  return {
    id,
    title,
    poster,
    backdrop,
    rating,
    year,
    duration,
    category: slug,
    categoryLabel: label,
    genres,
    description: `${title} - Watch online in high quality with multi-audio support on VDOSKy. Starring ${castList.slice(0, 4).join(', ')}.`,
    cast: castList,
    director: 'VDOSKy Cinema',
    audioLanguages: ['Hindi (Original)', 'Multilingual Audio'],
    videoId,
    videoUrl,
    videoType,
    videoSourceId: resolved.id,
    video: raw.video,
    yt: raw.yt,
    drc: raw.drc,
    streamServers,
    downloadLinks,
    isFeatured: index < 5
  };
}

export function parseSongAlbum(raw: UserRawSongAlbum, index: number): Movie {
  const albumName = (raw.movie || `Music Album #${index + 1}`).trim();
  const yearMatch = albumName.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 2024;

  const { slug, label } = formatCategory(raw.category);

  const cleanSlug = albumName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const id = `song-album-${index + 1}-${cleanSlug}`;

  const poster = raw.poster && raw.poster.trim() !== ''
    ? raw.poster.trim()
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  const songTitles = (raw.songs || []).map((s) => s.title || 'Track').filter(Boolean);
  const firstSongId = raw.songs && raw.songs[0]?.id ? raw.songs[0].id : '';

  let videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  if (firstSongId) {
    videoUrl = `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(firstSongId)}`;
  }

  const streamServers = [
    {
      name: 'High Quality Audio CDN 1',
      quality: '320kbps HD Audio',
      url: firstSongId ? `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(firstSongId)}` : videoUrl
    },
    {
      name: 'Direct Drive Stream 2',
      quality: 'Original Quality',
      url: firstSongId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(firstSongId)}` : videoUrl
    },
    {
      name: 'Drive Preview Player 3',
      quality: 'Auto Quality',
      url: firstSongId ? `https://drive.google.com/file/d/${encodeURIComponent(firstSongId)}/preview` : videoUrl
    }
  ];

  return {
    id,
    title: albumName,
    poster,
    backdrop: poster,
    rating: '4.9',
    year,
    duration: `${songTitles.length} Tracks`,
    category: slug,
    categoryLabel: label,
    genres: ['Music', 'Bollywood MP3', 'All-Time Hits'],
    description: `${albumName} includes ${songTitles.length} popular tracks: ${songTitles.slice(0, 5).join(', ')}.`,
    cast: songTitles.slice(0, 6),
    director: 'Musical Maestros',
    audioLanguages: ['Hindi Original MP3 / HD Audio'],
    videoUrl,
    streamServers,
    downloadLinks: [
      { quality: '320 kbps MP3 Full Album', size: '120 MB', resolution: 'Audio HD', url: firstSongId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(firstSongId)}` : '#' },
      { quality: '192 kbps Standard Quality', size: '75 MB', resolution: 'Audio Ready', url: firstSongId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(firstSongId)}` : '#' }
    ],
    isFeatured: false
  };
}

let cachedCatalog: Movie[] | null = null;

export function getFullMovieCatalog(): Movie[] {
  if (cachedCatalog && cachedCatalog.length > 0) {
    return cachedCatalog;
  }

  const movies: Movie[] = [];

  // 1. Process all 855 user movies from 8468988.json
  const rawMovies = (rawMoviesData as UserRawMovie[]) || [];
  rawMovies.forEach((item, idx) => {
    movies.push(parseMovieItem(item, idx));
  });

  cachedCatalog = movies;
  return movies;
}
