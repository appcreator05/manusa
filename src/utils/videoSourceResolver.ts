export type VideoPlayerType = 'video' | 'yt' | 'drc';

export interface StreamServerInfo {
  name: string;
  quality: string;
  url: string;
  type: VideoPlayerType;
}

export interface VideoSourceResolution {
  type: VideoPlayerType;
  id: string; // The ID or source string
  playerUrl: string; // Direct play or embed iframe URL
  rawUrl: string;
  label: string; // e.g. "Cloudflare Worker Stream", "YouTube Supported Player", "Plyr Direct Player"
  servers: StreamServerInfo[];
}

/**
 * Checks and resolves post video sources according to exact specification:
 * 1. "video": "1DlvdGn8QaXGuJVbeU6wrKxGUJfV-0Txh0"
 *    -> https://debasis.installapkapps.workers.dev/?id=1DlvdGn8QaXGuJVbeU6wrKxGUJfV-0Txh0
 * 2. "yt": "hf-EHqaybqI"
 *    -> https://www.youtube.com/embed/hf-EHqaybqI (YouTube supported player)
 * 3. "drc": "https://github.com/movieapp05/sps/releases/download/dsp/vdo3.mp4"
 *    -> Direct MP4 / Plyr player
 */
export function resolvePostVideoSource(post: {
  video?: string;
  yt?: string;
  drc?: string;
  videoUrl?: string;
  streamUrl?: string;
  url?: string;
  link?: string;
  [key: string]: any;
}): VideoSourceResolution {
  if (!post) {
    const fallbackUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
    return {
      type: 'drc',
      id: 'default',
      playerUrl: fallbackUrl,
      rawUrl: fallbackUrl,
      label: 'Default Stream',
      servers: [
        {
          name: 'Backup Server 1',
          quality: '1080p HD',
          url: fallbackUrl,
          type: 'drc'
        }
      ]
    };
  }

  // 1. CHECK "yt": YouTube Video ID or URL
  const ytRaw = (post.yt || post.youtube || '').trim();
  if (ytRaw) {
    let ytId = ytRaw;
    const match = ytRaw.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (match && match[1]) {
      ytId = match[1];
    }
    const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`;
    return {
      type: 'yt',
      id: ytId,
      playerUrl: embedUrl,
      rawUrl: `https://www.youtube.com/embed/${ytId}`,
      label: 'YouTube Supported Player',
      servers: [
        {
          name: 'Server 1 (YouTube HD Embed)',
          quality: 'Auto / 1080p',
          url: embedUrl,
          type: 'yt'
        },
        {
          name: 'Server 2 (YouTube Stream)',
          quality: '720p HD',
          url: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`,
          type: 'yt'
        }
      ]
    };
  }

  // 2. CHECK "drc": Direct video MP4 / stream URL for Plyr player
  const drcRaw = (post.drc || post.direct || '').trim();
  if (drcRaw) {
    return {
      type: 'drc',
      id: drcRaw,
      playerUrl: drcRaw,
      rawUrl: drcRaw,
      label: 'Plyr Direct Player',
      servers: [
        {
          name: 'Server 1 (Direct HD Stream)',
          quality: '1080p Ultra HD',
          url: drcRaw,
          type: 'drc'
        },
        {
          name: 'Server 2 (Direct Fast Stream)',
          quality: '720p HD',
          url: drcRaw,
          type: 'drc'
        }
      ]
    };
  }

  // 3. CHECK "video": Google Drive ID, Worker URL, or Stream URL
  const videoRaw = (post.video || post.videoUrl || post.streamUrl || post.url || post.link || '').trim();
  if (videoRaw) {
    // If videoRaw is a YouTube link
    if (videoRaw.includes('youtube.com') || videoRaw.includes('youtu.be')) {
      const match = videoRaw.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      const ytId = match ? match[1] : videoRaw;
      const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`;
      return {
        type: 'yt',
        id: ytId,
        playerUrl: embedUrl,
        rawUrl: `https://www.youtube.com/embed/${ytId}`,
        label: 'YouTube Supported Player',
        servers: [
          {
            name: 'Server 1 (YouTube HD Embed)',
            quality: 'Auto / 1080p',
            url: embedUrl,
            type: 'yt'
          }
        ]
      };
    }

    // If videoRaw is direct http/https URL
    if (videoRaw.startsWith('http://') || videoRaw.startsWith('https://')) {
      // If it contains debasis worker or drive id param
      const driveMatch = videoRaw.match(/id=([-\w]{25,})/);
      if (driveMatch && driveMatch[1]) {
        const driveId = driveMatch[1];
        const workerUrl = `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(driveId)}`;
        return {
          type: 'video',
          id: driveId,
          playerUrl: workerUrl,
          rawUrl: workerUrl,
          label: 'Worker CDN Player',
          servers: [
            {
              name: 'Server 1 (Fast Worker Stream)',
              quality: '1080p Ultra HD',
              url: workerUrl,
              type: 'video'
            },
            {
              name: 'Server 2 (Drive Direct HD)',
              quality: '720p HD',
              url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
              type: 'video'
            },
            {
              name: 'Server 3 (Google Drive Preview)',
              quality: 'Auto Quality',
              url: `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
              type: 'video'
            }
          ]
        };
      }

      // Otherwise direct MP4 / stream (drc)
      return {
        type: 'drc',
        id: videoRaw,
        playerUrl: videoRaw,
        rawUrl: videoRaw,
        label: 'Plyr Direct Player',
        servers: [
          {
            name: 'Server 1 (Direct HD Stream)',
            quality: '1080p Ultra HD',
            url: videoRaw,
            type: 'drc'
          },
          {
            name: 'Server 2 (Direct Fast Stream)',
            quality: '720p HD',
            url: videoRaw,
            type: 'drc'
          }
        ]
      };
    }

    // Otherwise it is a Google Drive file ID (e.g. "1DlvdGn8QaXGuJVbeU6wrKxGUJfV-0Txh0")
    let driveId = videoRaw;
    const match = videoRaw.match(/[-\w]{25,}/);
    if (match) {
      driveId = match[0];
    }
    const workerUrl = `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(driveId)}`;
    return {
      type: 'video',
      id: driveId,
      playerUrl: workerUrl,
      rawUrl: workerUrl,
      label: 'Worker CDN Player',
      servers: [
        {
          name: 'Server 1 (Fast Worker Stream)',
          quality: '1080p Ultra HD',
          url: workerUrl,
          type: 'video'
        },
        {
          name: 'Server 2 (Drive Direct HD)',
          quality: '720p HD',
          url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
          type: 'video'
        },
        {
          name: 'Server 3 (Google Drive Preview)',
          quality: 'Auto Quality',
          url: `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`,
          type: 'video'
        }
      ]
    };
  }

  // Fallback
  const defaultUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
  return {
    type: 'drc',
    id: 'default',
    playerUrl: defaultUrl,
    rawUrl: defaultUrl,
    label: 'Default Stream',
    servers: [
      {
        name: 'Backup Server 1',
        quality: '1080p HD',
        url: defaultUrl,
        type: 'drc'
      }
    ]
  };
}
