import React, { useState, useEffect, useRef, useCallback } from 'react';
import rawSongsData from '../data/userCatalog6766846.json';
import { StartIoNativeAd } from './StartIoNativeAd';

interface SongItem {
  id: string;
  title: string;
  poster: string;
  movie: string;
  category: string;
}

interface RawMusicItem {
  category?: string;
  movie?: string;
  poster?: string;
  songs?: Array<{ title?: string; id?: string }>;
}

interface MusicSectionProps {
  onBack: () => void;
}

export const MusicSection: React.FC<MusicSectionProps> = ({ onBack }) => {
  const [songsList, setSongsList] = useState<RawMusicItem[]>([]);
  const [currentQueue, setCurrentQueue] = useState<SongItem[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<SongItem[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [nowPlayingTitle, setNowPlayingTitle] = useState<string>('Not Playing');
  const [showMiniPlayer, setShowMiniPlayer] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('0:00');
  const [durationTime, setDurationTime] = useState<string>('0:00');
  const [progressVal, setProgressVal] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [searchVal, setSearchVal] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All Songs');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Visible song count with infinite scroll (30 items batch)
  const [visibleLimit, setVisibleLimit] = useState<number>(60);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver for auto loading 30 more songs on scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => Math.min(prev + 30, currentPlaylist.length));
        }
      },
      { rootMargin: '350px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentPlaylist.length]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Build song list from JSON
  const processRawData = useCallback((data: RawMusicItem[]) => {
    const queue: SongItem[] = [];
    data.forEach((m) => {
      const cat = m.category || 'General';
      const movieName = m.movie || 'Album';
      const poster = m.poster || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';

      (m.songs || []).forEach((s) => {
        if (s.id && s.title) {
          queue.push({
            id: s.id,
            title: s.title,
            poster,
            movie: movieName,
            category: cat
          });
        }
      });
    });

    const shuffled = shuffleArray(queue);
    setSongsList(data);
    setCurrentQueue(queue);
    setCurrentPlaylist(shuffled);
    setVisibleLimit(60);
    if (shuffled.length > 0) {
      setNowPlayingTitle(shuffled[0].title);
      setShowMiniPlayer(true);
    }
    setIsLoading(false);
  }, []);

  // Fetch or fallback to local bundle
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetch('https://raw.githubusercontent.com/appcreator05/post/main/6766846.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network response not ok');
        return res.json();
      })
      .then((data: RawMusicItem[]) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          processRawData(data);
        }
      })
      .catch(() => {
        if (mounted) {
          // Use bundled fallback
          processRawData(rawSongsData as unknown as RawMusicItem[]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [processRawData]);

  // Audio stream URL generator with fallback
  const getAudioUrl = (songId: string): string => {
    return `https://www.googleapis.com/drive/v3/files/${songId}?alt=media&key=AIzaSyAwS9f57z785lDD9aKedEEJVol_-P518v0`;
  };

  const playMusic = useCallback((index: number, playlist?: SongItem[]) => {
    const list = playlist || currentPlaylist;
    if (!list || list.length === 0 || !list[index]) return;

    const song = list[index];
    setCurrentSongIndex(index);
    setNowPlayingTitle(song.title);
    setShowMiniPlayer(true);

    if (modalImg) {
      setModalImg(song.poster);
    }

    if (audioRef.current) {
      const primaryUrl = getAudioUrl(song.id);
      audioRef.current.src = primaryUrl;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Try fallback proxy if googleapis fails
          if (audioRef.current) {
            audioRef.current.src = `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(song.id)}`;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        });
    }

    // Scroll active item into view smoothly
    setTimeout(() => {
      const activeEl = document.querySelector('.music-song-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [currentPlaylist, modalImg]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const nextSong = useCallback(() => {
    if (currentPlaylist.length === 0) return;
    const nextIdx = (currentSongIndex + 1) % currentPlaylist.length;
    playMusic(nextIdx);
  }, [currentSongIndex, currentPlaylist, playMusic]);

  const prevSong = useCallback(() => {
    if (currentPlaylist.length === 0) return;
    const prevIdx = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playMusic(prevIdx);
  }, [currentSongIndex, currentPlaylist, playMusic]);

  const stopMusicAndGoHome = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setShowMiniPlayer(false);
    onBack();
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!isNaN(dur) && dur > 0) {
      setProgressVal((cur / dur) * 100);
      setCurrentTime(formatTime(cur));
      setDurationTime(formatTime(dur));
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDurationTime(formatTime(audioRef.current.duration));
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    setProgressVal(val);
    const dur = audioRef.current.duration;
    if (!isNaN(dur) && dur > 0) {
      audioRef.current.currentTime = (val / 100) * dur;
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchVal(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        setCurrentPlaylist(currentQueue);
      } else {
        const filtered = currentQueue.filter(
          (s) => s.title.toLowerCase().includes(q) || s.movie.toLowerCase().includes(q)
        );
        setCurrentPlaylist(filtered);
      }
      setCurrentSongIndex(0);
    }, 250);
  };

  const filterByCategory = (cat: string) => {
    setActiveCategory(cat);
    const filtered = shuffleArray(currentQueue.filter((s) => s.category === cat));
    setCurrentPlaylist(filtered);
    setCurrentSongIndex(0);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showAllSongs = () => {
    setActiveCategory('All Songs');
    const shuffled = shuffleArray(currentQueue);
    setCurrentPlaylist(shuffled);
    setCurrentSongIndex(0);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Distinct categories list
  const categoriesList = Array.from(new Set(songsList.map((m) => m.category).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-black text-white font-sans relative selection:bg-red-600 selection:text-white pb-36">
      {/* Hidden Audio Player Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={nextSong}
      />

      {/* Image Modal for song poster zoom - leaves player completely unobstructed */}
      {modalImg && (
        <div
          id="imageModal"
          onClick={() => setModalImg(null)}
          className="fixed inset-0 z-[6000] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 pt-16 pb-56 sm:pb-60 animate-fadeIn cursor-pointer"
        >
          <div
            className="relative max-w-xs sm:max-w-sm w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              id="btn-close-song-modal"
              onClick={() => setModalImg(null)}
              className="self-end mb-2 text-white bg-black/85 border border-gray-600 hover:border-red-500 hover:text-red-400 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors shadow-xl"
              title="Close image"
            >
              ✕
            </button>
            <img
              src={modalImg}
              alt="Song poster"
              className="w-full max-h-[38vh] sm:max-h-[44vh] object-contain rounded-2xl border-2 border-[#ff3b30] shadow-[0_10px_35px_rgba(0,0,0,0.95)]"
            />
          </div>
        </div>
      )}

      {/* Sidebar Drawer */}
      <div
        id="sidebar"
        className={`fixed top-0 left-0 h-full bg-[#111] z-[4500] overflow-y-auto transition-all duration-300 shadow-2xl border-r border-gray-800 ${
          isSidebarOpen ? 'w-64 sm:w-72' : 'w-0'
        }`}
        style={{ overflowX: 'hidden' }}
      >
        <div className="pt-4 pb-24">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-3 right-4 text-gray-400 hover:text-white text-2xl font-bold cursor-pointer bg-transparent border-none"
          >
            ✕
          </button>

          <div className="px-5 py-3 border-b border-gray-800">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">Music Categories</span>
          </div>

          <a
            href="#home-back"
            onClick={(e) => {
              e.preventDefault();
              stopMusicAndGoHome();
            }}
            className="flex items-center gap-2.5 px-5 py-3.5 text-white font-bold text-sm border-b border-gray-800 hover:bg-[#ff3b30] transition-colors"
          >
            <span>🏠</span>
            <span>Home Back (Movies)</span>
          </a>

          <a
            href="#all-songs"
            onClick={(e) => {
              e.preventDefault();
              showAllSongs();
            }}
            className={`flex items-center justify-between px-5 py-3.5 text-white font-bold text-sm border-b border-gray-800 hover:bg-[#ff3b30] transition-colors ${
              activeCategory === 'All Songs' ? 'bg-[#ff3b30]' : ''
            }`}
          >
            <span>🎶 All Songs</span>
            <span className="text-xs opacity-75">{currentQueue.length}</span>
          </a>

          {categoriesList.map((cat) => (
            <a
              key={cat}
              href={`#${cat}`}
              onClick={(e) => {
                e.preventDefault();
                filterByCategory(cat);
              }}
              className={`block px-5 py-3 text-white text-sm border-b border-gray-800/60 hover:bg-[#ff3b30] transition-colors ${
                activeCategory === cat ? 'bg-[#ff3b30] font-bold' : 'text-gray-300'
              }`}
            >
              {cat}
            </a>
          ))}
        </div>
      </div>

      {/* Backdrop overlay for sidebar */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-[4400] backdrop-blur-xs"
        />
      )}

      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#1a1a1a] border-b border-gray-800 flex items-center px-3 z-[1000] gap-2.5 shadow-md">
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="bg-[#ff3b30] hover:bg-red-600 text-white font-black text-xs sm:text-sm px-3.5 py-2 rounded-lg cursor-pointer shrink-0 transition-transform active:scale-95 shadow"
        >
          ☰ Menu
        </button>

        <input
          type="text"
          id="musicSearch"
          placeholder="Search songs, albums..."
          value={searchVal}
          onChange={handleSearchChange}
          className="flex-1 px-3 py-2 rounded-lg bg-[#262626] border border-[#d21515] text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-gray-400"
        />

        <button
          onClick={stopMusicAndGoHome}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer shrink-0 transition-colors border border-gray-700"
          title="Back to Movies"
        >
          🏠 Movies
        </button>
      </header>

      {/* Music Items List */}
      <main className="pt-20 px-3 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-5 bg-[#ff3b30] rounded-full" />
            <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
              {activeCategory}
            </h1>
          </div>
          <span className="text-xs text-gray-400 font-bold bg-[#1c1c1e] px-2.5 py-1 rounded-full border border-gray-800">
            {currentPlaylist.length} Songs
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold">Loading Songs Library...</span>
          </div>
        ) : currentPlaylist.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-base font-bold text-gray-300">No songs found matching "{searchVal}"</p>
            <button
              onClick={() => {
                setSearchVal('');
                setCurrentPlaylist(currentQueue);
              }}
              className="mt-3 bg-[#ff3b30] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div id="musicList" className="space-y-2.5">
            {currentPlaylist.slice(0, visibleLimit).map((song, i) => {
              const activeSong = currentPlaylist[currentSongIndex];
              const isItemActive = Boolean(activeSong && activeSong.id === song.id && isPlaying);

              return (
                <React.Fragment key={`${song.id}-${i}`}>
                  <div
                    className={`music-song-item flex items-center bg-[#1c1c1e] p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.99] border select-none ${
                      isItemActive
                        ? 'active border-[#ff3b30] bg-[#2a1515]'
                        : 'border-transparent hover:border-gray-700 hover:bg-[#222225]'
                    }`}
                    style={{ minHeight: '59px' }}
                  >
                    <img
                      src={song.poster}
                      alt={song.title}
                      loading="lazy"
                      decoding="async"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalImg(song.poster);
                        if (!showMiniPlayer) {
                          playMusic(i);
                        }
                      }}
                      className="w-12 h-12 rounded-lg mr-3.5 object-cover shrink-0 border border-gray-800 hover:scale-105 transition-transform"
                    />

                    <div
                      className="flex-1 min-w-0 pr-2 overflow-hidden"
                      onClick={() => playMusic(i)}
                    >
                      <strong className="block text-xs sm:text-sm font-bold text-gray-100 truncate">
                        {song.title}
                      </strong>
                      <small className="block text-[11px] text-gray-400 truncate mt-0.5">
                        {song.movie}
                      </small>
                    </div>

                    <div
                      onClick={() => playMusic(i)}
                      className="shrink-0 pl-1"
                    >
                      {isItemActive ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block mr-1" />
                      ) : (
                        <span className="text-[10px] text-gray-500 font-mono">▶</span>
                      )}
                    </div>
                  </div>

                  {/* Show 1 Native Ad after every 30 songs */}
                  {(i + 1) % 30 === 0 && (
                    <div className="my-4 px-0.5" id={`music-native-ad-${Math.floor((i + 1) / 30)}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">
                          Sponsored Promotion
                        </span>
                        <span className="h-px bg-cyan-900/40 flex-1" />
                      </div>
                      <StartIoNativeAd
                        variant={(i + 1) % 60 === 0 ? 'banner-row' : 'player-inline'}
                        adIndex={Math.floor((i + 1) / 30) - 1}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Sentinel and Load More Songs */}
            {visibleLimit < currentPlaylist.length && (
              <div ref={sentinelRef} className="pt-4 pb-6 text-center">
                <button
                  onClick={() => setVisibleLimit((prev) => Math.min(prev + 30, currentPlaylist.length))}
                  className="px-4 py-2 text-xs font-bold text-gray-200 bg-[#1f2430] hover:bg-[#283040] border border-cyan-500/30 rounded-xl transition-all cursor-pointer shadow"
                >
                  Load More Songs ({currentPlaylist.length - visibleLimit} more available)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mini Player Fixed at Bottom - ALWAYS VISIBLE with z-[7000] */}
      {showMiniPlayer && (
        <div
          id="miniPlayer"
          className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] p-4 flex flex-col rounded-t-2xl z-[7000] shadow-[0_-8px_30px_rgba(0,0,0,0.95)] border-t-2 border-[#ff3b30] max-w-xl mx-auto select-none pointer-events-auto"
        >
          {/* Song Title at Top */}
          <div
            id="nowPlaying"
            className="text-center font-black text-sm text-white mb-2 truncate px-3"
          >
            {nowPlayingTitle}
          </div>

          {/* Progress Box */}
          <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-2 px-1">
            <span id="currentTime" className="w-9 text-right font-mono text-[11px]">
              {currentTime}
            </span>
            <input
              type="range"
              id="audioRange"
              value={progressVal}
              min={0}
              max={100}
              step={0.1}
              onChange={handleRangeChange}
              className="flex-1 accent-[#ff3b30] cursor-pointer h-1.5 bg-gray-700 rounded-lg"
            />
            <span id="durationTime" className="w-9 font-mono text-[11px]">
              {durationTime}
            </span>
          </div>

          {/* Controls with the exact icons requested */}
          <div className="flex justify-center items-center gap-7 sm:gap-9 text-2xl mt-1">
            <button
              id="btn-music-prev"
              onClick={prevSong}
              className="bg-transparent border-none p-0 cursor-pointer outline-none inline-flex justify-center items-center transition-transform hover:scale-110 active:scale-95"
              title="Previous Track"
            >
              <img
                src="/preview.png"
                alt="Previous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/preview.jpg';
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg shadow-blue-950/60"
              />
            </button>

            <button
              id="btn-music-playpause"
              onClick={togglePlay}
              className="bg-transparent border-none p-0 cursor-pointer outline-none inline-flex justify-center items-center transition-transform hover:scale-110 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <img
                id="playPauseImg"
                src={isPlaying ? '/pause.png' : '/play.png'}
                alt={isPlaying ? 'Pause' : 'Play'}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = isPlaying ? '/pause.jpg' : '/play.jpg';
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover shadow-xl shadow-blue-950/80 ring-1 ring-cyan-500/20"
              />
            </button>

            <button
              id="btn-music-next"
              onClick={nextSong}
              className="bg-transparent border-none p-0 cursor-pointer outline-none inline-flex justify-center items-center transition-transform hover:scale-110 active:scale-95"
              title="Next Track"
            >
              <img
                src="/next.png"
                alt="Next"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/next.jpg';
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover shadow-lg shadow-blue-950/60"
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
