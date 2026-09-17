export type VideoPlayerType = 'video' | 'yt' | 'drc';

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  poster: string;
  backdrop?: string;
  rating: string;
  year?: number;
  duration?: string;
  category: string;
  categoryLabel: string;
  genres: string[];
  description?: string;
  cast: string[];
  director?: string;
  audioLanguages?: string[];
  videoId?: string;
  videoUrl: string;
  videoType?: VideoPlayerType;
  videoSourceId?: string;
  video?: string;
  yt?: string;
  drc?: string;
  streamServers: { name: string; quality: string; url: string; type?: VideoPlayerType }[];
  downloadLinks?: { quality: string; size: string; resolution: string; url: string }[];
  isFeatured?: boolean;
}

export interface AdCreative {
  id: string;
  title: string;
  tagline: string;
  description: string;
  advertiser: string;
  rating: number;
  reviewsCount: string;
  badge: string; // e.g., "AD · Start.io", "Sponsored"
  ctaText: string;
  ctaUrl: string;
  icon: string;
  mediaImage: string;
  mediaVideo?: string;
  appCategory: string;
  appSize?: string;
  installs?: string;
}

export interface StartIoConfig {
  appId: string;
  enableBanner: boolean;
  enableNative: boolean;
  enableInterstitial: boolean;
  interstitialSkipCountdown: number; // e.g. 5 seconds
  interstitialFrequency: 'every_click' | 'every_2_clicks';
  testMode: boolean;
  bannerPosition: 'bottom' | 'top';
  customAdUrl?: string; // Optional custom SmartLink or advertiser URL
}

export interface AdStats {
  bannerImpressions: number;
  nativeImpressions: number;
  interstitialImpressions: number;
  clicks: number;
  lastAdTime: number | null;
}
