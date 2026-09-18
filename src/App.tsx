import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { MovieCard } from './components/MovieCard';
import { MoviePlayPage } from './components/MoviePlayPage';
import { StartIoBannerAd } from './components/StartIoBannerAd';
import { StartIoNativeAd } from './components/StartIoNativeAd';
import { StartIoRewardedVideoAd } from './components/StartIoRewardedVideoAd';
import { SmartlinkInterstitialAd, SMARTLINK_DEFAULT_URL } from './components/SmartlinkInterstitialAd';
import { DrawerMenu } from './components/DrawerMenu';
import { MusicSection } from './components/MusicSection';
import { SubscriptionSection } from './components/SubscriptionSection';
import { StartIoConfigModal } from './components/StartIoConfigModal';
import { PageLoadingIndicator, TopProgressBar } from './components/PageLoadingIndicator';
import { SplashScreen } from './components/SplashScreen';
import { DEFAULT_STARTIO_CONFIG, SAMPLE_MOVIES } from './data/movies';
import { Movie, StartIoConfig, AdStats } from './types';
import {
  fetchMoviesFromRemote,
  USER_JSON_URL,
  SEED_MOVIES,
  SEED_CATALOG_MOVIES,
  transformRawMovie,
  isMusicItem
} from './services/movieService';
import {
  ChevronRight,
  ArrowDownCircle,
  RefreshCw,
  ArrowLeft,
  Film,
  Sparkles,
  Crown,
  ArrowRight
} from 'lucide-react';
import { hideSystemNavigation } from './utils/systemBars';
import { requestScreenWakeLock } from './utils/wakeLock';
import {
  isNativeAndroidApk,
  triggerNativeStartIoRewardedVideo,
  triggerNativeStartIoInterstitial,
  triggerNativeStartIoBanner,
  reportStartIoInteraction
} from './utils/startIoAndroidBridge';
import { AutoUpdateModal } from './components/AutoUpdateModal';
import { checkForAppUpdate, AppUpdateData, CURRENT_APP_VERSION } from './services/updateService';
import {
  getCachedIsSubscribed,
  getStoredSafeId,
  checkAndHandleSubscriptionExpiry
} from './services/subscriptionService';

const GRID_BATCH_SIZE = 20; // 20 items loaded per lazy scroll batch

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [interstitialPendingMovie, setInterstitialPendingMovie] = useState<Movie | null>(null);
  const [clickedMovieId, setClickedMovieId] = useState<string | null>(null);
  const [showDrawerMenu, setShowDrawerMenu] = useState(false);
  const [showAdConfigModal, setShowAdConfigModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Firebase In-App Auto Update states
  const [appUpdateData, setAppUpdateData] = useState<AppUpdateData | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateToastMessage, setUpdateToastMessage] = useState<string | null>(null);

  // 15-minute Periodic Interstitial Ad state
  const [showPeriodicInterstitial, setShowPeriodicInterstitial] = useState(false);

  // Dedicated Category View Page (opens in separate section when Show All is clicked)
  const [activeCategoryPage, setActiveCategoryPage] = useState<{ slug: string; label: string } | null>(null);

  // Pagination for lazy loading 20 at a time
  const [visibleGridCount, setVisibleGridCount] = useState<number>(GRID_BATCH_SIZE);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState<number>(GRID_BATCH_SIZE);

  // Loading indicator states: Initial load and Page Transition loader
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('Loading...');

  // Exit toast for Android double-back prevention
  const [showExitToast, setShowExitToast] = useState(false);
  const backPressCountRef = useRef(0);

  // Movie database state (strictly movies only, no music albums)
  const [movies, setMovies] = useState<Movie[]>(() => {
    return SEED_CATALOG_MOVIES.filter((m) => !isMusicItem(m));
  });
  const [jsonLoadedCount, setJsonLoadedCount] = useState<number | null>(null);

  // IntersectionObserver sentinel refs for lazy loading
  const mainGridEndRef = useRef<HTMLDivElement | null>(null);
  const categoryGridEndRef = useRef<HTMLDivElement | null>(null);

  // Refs for current navigation state to handle hardware Back button safely
  const selectedMovieRef = useRef(selectedMovie);
  const activeCategoryPageRef = useRef(activeCategoryPage);
  const showDrawerMenuRef = useRef(showDrawerMenu);
  const searchQueryRef = useRef(searchQuery);

  // Fullscreen video state tracking to automatically hide search header & ads
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const isPlayerFullscreenRef = useRef(false);

  useEffect(() => {
    isPlayerFullscreenRef.current = isPlayerFullscreen;
  }, [isPlayerFullscreen]);

  useEffect(() => {
    selectedMovieRef.current = selectedMovie;
  }, [selectedMovie]);

  useEffect(() => {
    activeCategoryPageRef.current = activeCategoryPage;
  }, [activeCategoryPage]);

  useEffect(() => {
    showDrawerMenuRef.current = showDrawerMenu;
  }, [showDrawerMenu]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Dedicated Music Player Section state
  const [isMusicView, setIsMusicView] = useState(false);
  const isMusicViewRef = useRef(false);

  useEffect(() => {
    isMusicViewRef.current = isMusicView;
  }, [isMusicView]);

  // Dedicated VIP / Ad-Free Subscription Section state
  const [isSubscriptionView, setIsSubscriptionView] = useState(false);
  const isSubscriptionViewRef = useRef(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => getCachedIsSubscribed());
  const isSubscribedRef = useRef(isSubscribed);

  useEffect(() => {
    isSubscriptionViewRef.current = isSubscriptionView;
  }, [isSubscriptionView]);

  useEffect(() => {
    isSubscribedRef.current = isSubscribed;
    // Set global flag so other components/modules know subscription status
    (window as any).__hasActiveSubscription = isSubscribed;
  }, [isSubscribed]);

  // Periodic subscription & auto-expiry verification
  // When expiry is detected: auto deletes the subkey from Firebase & restarts ads immediately
  useEffect(() => {
    const verifySubscription = async () => {
      const safeId = getStoredSafeId();
      if (!safeId) {
        setIsSubscribed(false);
        return;
      }
      try {
        const result = await checkAndHandleSubscriptionExpiry(safeId);
        setIsSubscribed(result.isSubscribed);
      } catch (e) {
        console.warn('[Subscription] Auto verification error:', e);
      }
    };

    verifySubscription();
    // Check every 15 seconds so that as soon as validity expires, subkey is deleted and ads resume
    const timer = setInterval(verifySubscription, 15000);
    return () => clearInterval(timer);
  }, []);

  // Configuration for Start.io ads (Real App ID: 203877183)
  const [startIoConfig, setStartIoConfig] = useState<StartIoConfig>(() => {
    const defaultConf: StartIoConfig = {
      ...DEFAULT_STARTIO_CONFIG,
      appId: '203877183',
      testMode: false
    };
    try {
      const saved = localStorage.getItem('vdosky_startio_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          appId: parsed.appId === '208942177' ? '203877183' : (parsed.appId || '203877183'),
          testMode: false
        };
      }
      return defaultConf;
    } catch {
      return defaultConf;
    }
  });

  // Track ad stats
  const [adStats, setAdStats] = useState<AdStats>(() => {
    try {
      const saved = localStorage.getItem('vdosky_ad_stats');
      return saved ? JSON.parse(saved) : {
        bannerImpressions: 0,
        nativeImpressions: 0,
        interstitialImpressions: 0,
        clicks: 0,
        lastAdTime: null
      };
    } catch {
      return {
        bannerImpressions: 0,
        nativeImpressions: 0,
        interstitialImpressions: 0,
        clicks: 0,
        lastAdTime: null
      };
    }
  });

  // Page Transition helper - shows centered spinner during screen switch
  const triggerPageTransition = (action: () => void, message: string = 'Loading...') => {
    setTransitionMessage(message);
    setIsPageTransitioning(true);
    setTimeout(() => {
      action();
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      setTimeout(() => {
        setIsPageTransitioning(false);
      }, 250);
    }, 180);
  };

  // Safe Back Navigation Handler (for UI back buttons, browser popstate, and Android hardware back button)
  const handleBackNavigation = useCallback((pushHistory = true) => {
    // If video player is in fullscreen mode, exit fullscreen first
    if (isPlayerFullscreenRef.current) {
      setIsPlayerFullscreen(false);
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        }
      } catch {}
      return true;
    }

    if (isSubscriptionViewRef.current) {
      triggerPageTransition(() => {
        setIsSubscriptionView(false);
      }, 'Returning to Movies...');
      return true;
    }

    if (isMusicViewRef.current) {
      triggerPageTransition(() => {
        setIsMusicView(false);
      }, 'Returning to Movies...');
      return true;
    }

    if (selectedMovieRef.current) {
      setIsPlayerFullscreen(false);
      triggerPageTransition(() => {
        setSelectedMovie(null);
      }, 'Returning to movies...');
      return true;
    }

    if (activeCategoryPageRef.current) {
      triggerPageTransition(() => {
        setActiveCategoryPage(null);
      }, 'Returning to Home...');
      return true;
    }

    if (showDrawerMenuRef.current) {
      setShowDrawerMenu(false);
      return true;
    }

    if (searchQueryRef.current.trim() !== '') {
      setSearchQuery('');
      return true;
    }

    // If at root Home view: Show toast to prevent accidental exit
    if (backPressCountRef.current > 0) {
      // Allow exit
      return false;
    } else {
      backPressCountRef.current = 1;
      setShowExitToast(true);
      setTimeout(() => {
        backPressCountRef.current = 0;
        setShowExitToast(false);
      }, 2000);
      return true; // Handled, don't close app
    }
  }, []);

  // Android Capacitor Back Button & Browser History Event Setup
  useEffect(() => {
    // 1. Browser popstate listener
    const onPopState = (e: PopStateEvent) => {
      const handled = handleBackNavigation(false);
      if (handled) {
        // Prevent default exit
        window.history.pushState({ vdosky: true }, '');
      }
    };
    window.addEventListener('popstate', onPopState);
    // Push initial baseline state
    window.history.pushState({ vdosky: true }, '');

    // 2. Capacitor Android hardware back button listener
    let removeCapacitorListener: (() => void) | null = null;
    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        const handlePromise = CapApp.addListener('backButton', () => {
          const handled = handleBackNavigation(false);
          if (!handled) {
            CapApp.exitApp();
          }
        });
        removeCapacitorListener = () => {
          handlePromise.then((h) => h.remove()).catch(() => {});
        };
      })
      .catch(() => {
        // Capacitor app plugin not available in browser preview
      });

    return () => {
      window.removeEventListener('popstate', onPopState);
      removeCapacitorListener?.();
    };
  }, [handleBackNavigation]);

  // Auto-hide Android system navigation bar, status bar, and keep screen continuously ON
  useEffect(() => {
    // Initial attempts right when app opens
    hideSystemNavigation();
    requestScreenWakeLock();
    const t1 = setTimeout(() => {
      hideSystemNavigation();
      requestScreenWakeLock();
    }, 400);
    const t2 = setTimeout(() => {
      hideSystemNavigation();
      requestScreenWakeLock();
    }, 1200);

    // If running in native Android APK and user is not VIP subscribed, trigger native Start.io banner
    if (isNativeAndroidApk() && !isSubscribedRef.current) {
      triggerNativeStartIoBanner();
    }

    // Re-hide and re-engage screen wake lock when returning from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        hideSystemNavigation();
        requestScreenWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also re-engage on user interaction gestures
    const handleUserInteraction = () => {
      requestScreenWakeLock();
    };
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // 15-Minute Periodic Interstitial Ad:
  // Shows full-screen interstitial ad every 15 minutes of app usage
  useEffect(() => {
    const INTERSTITIAL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    const storedLast = parseInt(localStorage.getItem('vdosky_last_interstitial') || '0', 10);
    if (!storedLast) {
      localStorage.setItem('vdosky_last_interstitial', Date.now().toString());
    }

    const intervalId = setInterval(() => {
      // If user has active VIP subscription, completely skip periodic interstitials
      if (isSubscribedRef.current) return;

      const lastTime = parseInt(localStorage.getItem('vdosky_last_interstitial') || '0', 10);
      const elapsed = Date.now() - (lastTime || Date.now());
      if (elapsed >= INTERSTITIAL_INTERVAL_MS) {
        localStorage.setItem('vdosky_last_interstitial', Date.now().toString());
        // Trigger Smartlink 15-minute periodic interstitial ad modal (with 15s timer & Chrome opener)
        setShowPeriodicInterstitial(true);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Fetch movies from Cloudflare Worker endpoint on mount
  useEffect(() => {
    let isMounted = true;
    setIsInitialLoading(true);

    // Keep splash screen visible for at least 2.2s on startup so user sees it
    const splashTimer = setTimeout(() => {
      if (isMounted) setShowSplashScreen(false);
    }, 2200);

    fetchMoviesFromRemote(USER_JSON_URL)
      .then((loaded) => {
        if (isMounted && loaded.length > 0) {
          const pureMovies = loaded.filter((m) => !isMusicItem(m));
          setMovies(pureMovies);
          setJsonLoadedCount(pureMovies.length);
        }
      })
      .catch((err) => {
        console.error('Remote movies fetch error:', err);
      })
      .finally(() => {
        if (isMounted) {
          setTimeout(() => {
            setIsInitialLoading(false);
          }, 350);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Firebase In-App Auto Update Checker
  const performUpdateCheck = useCallback(async (isManual: boolean = false) => {
    if (isManual) setIsCheckingUpdate(true);
    try {
      const res = await checkForAppUpdate();
      if (res.hasUpdate && res.updateData) {
        setAppUpdateData(res.updateData);
        setShowUpdateModal(true);
      } else if (isManual) {
        setUpdateToastMessage(`You are using the latest version of VDOSKy (v${CURRENT_APP_VERSION})`);
        setTimeout(() => setUpdateToastMessage(null), 3500);
      }
    } catch (err) {
      console.warn('[AutoUpdate] Check failed:', err);
      if (isManual) {
        setUpdateToastMessage('Could not connect to update server. Please check internet.');
        setTimeout(() => setUpdateToastMessage(null), 3500);
      }
    } finally {
      if (isManual) setIsCheckingUpdate(false);
    }
  }, []);

  // Check for updates automatically on app launch
  useEffect(() => {
    const timer = setTimeout(() => {
      performUpdateCheck(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [performUpdateCheck]);

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem('vdosky_startio_config', JSON.stringify(startIoConfig));
    } catch {}
  }, [startIoConfig]);

  // Persist stats
  useEffect(() => {
    try {
      localStorage.setItem('vdosky_ad_stats', JSON.stringify(adStats));
    } catch {}
  }, [adStats]);

  // Reset pagination when search query or selected category changes
  useEffect(() => {
    setVisibleGridCount(GRID_BATCH_SIZE);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    setVisibleCategoryCount(GRID_BATCH_SIZE);
  }, [activeCategoryPage]);

  // Lazy Loading on Scroll via IntersectionObserver for Home / Search Grid (loads 20 items at a time)
  useEffect(() => {
    const sentinel = mainGridEndRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleGridCount((prev) => prev + GRID_BATCH_SIZE);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [searchQuery, selectedCategory, movies]);

  // Lazy Loading on Scroll via IntersectionObserver for Dedicated Category Page (loads 20 items at a time)
  useEffect(() => {
    const sentinel = categoryGridEndRef.current;
    if (!sentinel || !activeCategoryPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCategoryCount((prev) => prev + GRID_BATCH_SIZE);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeCategoryPage, movies]);

  const recordAdClick = useCallback(() => {
    reportStartIoInteraction('click');
    setAdStats((prev) => ({
      ...prev,
      clicks: prev.clicks + 1
    }));
  }, []);

  const recordBannerImpression = useCallback(() => {
    reportStartIoInteraction('impression', 'banner');
    setAdStats((prev) => ({
      ...prev,
      bannerImpressions: prev.bannerImpressions + 1
    }));
  }, []);

  const recordNativeImpression = useCallback(() => {
    reportStartIoInteraction('impression', 'native');
    setAdStats((prev) => ({
      ...prev,
      nativeImpressions: prev.nativeImpressions + 1
    }));
  }, []);

  const recordInterstitialImpression = useCallback(() => {
    reportStartIoInteraction('impression', 'interstitial');
    setAdStats((prev) => ({
      ...prev,
      interstitialImpressions: prev.interstitialImpressions + 1,
      lastAdTime: Date.now()
    }));
  }, []);

  // Triggered when a user clicks on ANY movie poster:
  const handleMoviePosterClick = (movie: Movie) => {
    setClickedMovieId(movie.id);

    // If user has an active VIP subscription: ZERO ADS, stream starts immediately!
    if (isSubscribed) {
      setClickedMovieId(null);
      triggerPageTransition(() => {
        setSelectedMovie(movie);
      }, 'Starting VIP Ad-Free Stream...');
      return;
    }

    // 1. Android Native APK: Launch official native Start.io Rewarded Video SDK
    // Start.io native activity takes over fullscreen with its real timer and skip button
    if (isNativeAndroidApk()) {
      const triggered = triggerNativeStartIoRewardedVideo(() => {
        setClickedMovieId(null);
        triggerPageTransition(() => {
          setSelectedMovie(movie);
        }, 'Starting stream...');
      });

      if (triggered) {
        return; // Pure native Start.io SDK handles the ad; do not show web modal
      }
    }

    // 2. Web Browser / Preview environment:
    if (startIoConfig.enableInterstitial) {
      setTimeout(() => {
        setInterstitialPendingMovie(movie);
      }, 180);
    } else {
      triggerPageTransition(() => {
        setSelectedMovie(movie);
        setClickedMovieId(null);
      }, 'Starting stream...');
    }
  };

  // Called when interstitial ad completes / skipped / closed
  const handleInterstitialComplete = () => {
    setClickedMovieId(null);
    if (interstitialPendingMovie) {
      const nextMovie = interstitialPendingMovie;
      setInterstitialPendingMovie(null);
      triggerPageTransition(() => {
        setSelectedMovie(nextMovie);
      }, 'Starting stream...');
    }
  };

  const handleTestInterstitial = () => {
    const testMovie = movies[0];
    if (testMovie) {
      setClickedMovieId(testMovie.id);
      setInterstitialPendingMovie(testMovie);
    }
  };

  const handleResetHome = () => {
    setIsPlayerFullscreen(false);
    setClickedMovieId(null);
    triggerPageTransition(() => {
      setSelectedMovie(null);
      setActiveCategoryPage(null);
      setIsMusicView(false);
      setIsSubscriptionView(false);
      setSearchQuery('');
      setSelectedCategory('all');
    }, 'Loading Home...');
  };

  // Open dedicated Category Page when "Show All" is clicked
  const handleOpenCategoryPage = (slug: string, label: string) => {
    triggerPageTransition(() => {
      setSelectedMovie(null);
      setActiveCategoryPage({ slug, label });
    }, `Opening ${label}...`);
  };

  // Group movies by category dynamically (strictly excluding any music sections)
  const categoryGroups = useMemo(() => {
    const map = new Map<string, { label: string; slug: string; movies: Movie[] }>();

    movies.forEach((m) => {
      if (isMusicItem(m)) return;
      const key = m.categoryLabel || 'Bollywood Hindi Movie';
      if (!map.has(key)) {
        map.set(key, {
          label: key,
          slug: m.category,
          movies: []
        });
      }
      map.get(key)!.movies.push(m);
    });

    return Array.from(map.values());
  }, [movies]);

  // Drawer menu categories list
  const drawerCategories = useMemo(() => {
    const list = categoryGroups.map((g) => ({
      id: g.slug,
      label: g.label,
      count: g.movies.length
    }));
    return [
      { id: 'all', label: `All Movies (${movies.length}+ Titles)`, count: movies.length },
      ...list
    ];
  }, [categoryGroups, movies.length]);

  // Filtered movies based on search and category
  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return movies.filter((m) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        m.category === selectedCategory ||
        m.categoryLabel.toLowerCase().includes(selectedCategory.toLowerCase());

      if (!matchesCategory) return false;

      if (!query) return true;

      const titleMatch = m.title.toLowerCase().includes(query);
      const genreMatch = m.genres.some((g) => g.toLowerCase().includes(query));
      const castMatch = m.cast.some((c) => c.toLowerCase().includes(query));
      const catMatch = m.categoryLabel.toLowerCase().includes(query);

      return titleMatch || genreMatch || castMatch || catMatch;
    });
  }, [movies, searchQuery, selectedCategory]);

  // Movies for active category page
  const activeCategoryMovies = useMemo(() => {
    if (!activeCategoryPage) return [];
    return movies.filter(
      (m) =>
        m.category === activeCategoryPage.slug ||
        m.categoryLabel.toLowerCase() === activeCategoryPage.label.toLowerCase()
    );
  }, [movies, activeCategoryPage]);

  // Visible sliced list for main grid view (lazy loads in batches of 20)
  const paginatedGridMovies = useMemo(() => {
    return filteredMovies.slice(0, visibleGridCount);
  }, [filteredMovies, visibleGridCount]);

  const hasMoreGridMovies = visibleGridCount < filteredMovies.length;

  // Visible sliced list for dedicated category view (lazy loads in batches of 20)
  const paginatedCategoryMovies = useMemo(() => {
    return activeCategoryMovies.slice(0, visibleCategoryCount);
  }, [activeCategoryMovies, visibleCategoryCount]);

  const hasMoreCategoryMovies = visibleCategoryCount < activeCategoryMovies.length;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-gray-100 flex flex-col font-sans selection:bg-red-600 selection:text-white relative">
      
      {/* Mobile Fullscreen Splash Screen with splash.png */}
      <SplashScreen
        isVisible={showSplashScreen}
        onFinish={() => setShowSplashScreen(false)}
      />

      {/* Top Progress Bar when loading or syncing */}
      <TopProgressBar isAnimating={isInitialLoading || isPageTransitioning} />

      {/* Centered Processing Loader on subsequent navigation */}
      {!showSplashScreen && (isInitialLoading || isPageTransitioning) && (
        <PageLoadingIndicator
          fullScreen
          message={isInitialLoading ? 'Loading VDOSKy...' : transitionMessage}
          subMessage={isInitialLoading ? 'Connecting to movie library and optimizing stream feed' : 'Preparing movie stream'}
        />
      )}

      {/* Android Exit Confirmation Toast */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#161d2b] border border-gray-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl animate-fadeIn">
          Press back again to exit VDOSKy
        </div>
      )}

      {/* Header with VDOSKy logo & voice search (Hidden when video is playing in fullscreen, in Music section, or in Subscription section) */}
      {!isPlayerFullscreen && !isMusicView && !isSubscriptionView && (
        <Header
          onOpenMenu={() => setShowDrawerMenu(true)}
          onOpenSubscriptionSection={() => {
            setSelectedMovie(null);
            setActiveCategoryPage(null);
            setIsMusicView(false);
            setIsSubscriptionView(true);
          }}
          isSubscribed={isSubscribed}
          onOpenMusicSection={() => {
            setSelectedMovie(null);
            setActiveCategoryPage(null);
            setIsSubscriptionView(false);
            setIsMusicView(true);
          }}
          onOpenAdConfig={() => setShowAdConfigModal(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startIoConfig={startIoConfig}
          adStats={adStats}
          onLogoClick={handleResetHome}
        />
      )}

      {/* Drawer Menu */}
      <DrawerMenu
        isOpen={showDrawerMenu}
        onClose={() => setShowDrawerMenu(false)}
        selectedCategory={activeCategoryPage ? activeCategoryPage.slug : selectedCategory}
        onSelectCategory={(catId) => {
          setIsMusicView(false);
          setIsSubscriptionView(false);
          if (catId === 'all') {
            setActiveCategoryPage(null);
            setSelectedCategory('all');
          } else {
            const found = categoryGroups.find((g) => g.slug === catId);
            if (found) {
              handleOpenCategoryPage(found.slug, found.label);
            } else {
              setSelectedCategory(catId);
              setActiveCategoryPage(null);
            }
          }
          setShowDrawerMenu(false);
        }}
        onOpenSubscriptionSection={() => {
          setSelectedMovie(null);
          setActiveCategoryPage(null);
          setIsMusicView(false);
          setIsSubscriptionView(true);
          setShowDrawerMenu(false);
        }}
        isSubscribed={isSubscribed}
        onOpenMusicSection={() => {
          setSelectedMovie(null);
          setActiveCategoryPage(null);
          setIsSubscriptionView(false);
          setIsMusicView(true);
          setShowDrawerMenu(false);
        }}
        onOpenSplashScreen={() => {
          setShowSplashScreen(true);
        }}
        onOpenAdConfig={() => setShowAdConfigModal(true)}
        onCheckForUpdate={() => performUpdateCheck(true)}
        isCheckingUpdate={isCheckingUpdate}
        startIoConfig={startIoConfig}
        adStats={adStats}
        availableCategories={drawerCategories}
      />

      {/* Start.io Configuration Modal */}
      <StartIoConfigModal
        isOpen={showAdConfigModal}
        onClose={() => setShowAdConfigModal(false)}
        config={startIoConfig}
        onSaveConfig={setStartIoConfig}
        adStats={adStats}
        onTestInterstitial={handleTestInterstitial}
      />

      {/* Start.io Rewarded Video Ad Modal (Triggers on Movie Poster Click to Unlock HD Stream - Blocked if Subscribed) */}
      {!isSubscribed && interstitialPendingMovie && (
        <StartIoRewardedVideoAd
          movie={interstitialPendingMovie}
          onCloseAndPlay={handleInterstitialComplete}
          skipCountdownSeconds={startIoConfig.interstitialSkipCountdown}
          onAdClick={recordAdClick}
          onAdImpression={recordInterstitialImpression}
          customAdUrl={startIoConfig.customAdUrl}
        />
      )}

      {/* 15-Minute Periodic Fullscreen Interstitial Ad (Smartlink CPM Network - Blocked if Subscribed) */}
      {!isSubscribed && (
        <SmartlinkInterstitialAd
          isOpen={showPeriodicInterstitial}
          onClose={() => setShowPeriodicInterstitial(false)}
          smartlinkUrl={startIoConfig.customAdUrl || SMARTLINK_DEFAULT_URL}
          wasFullscreen={isPlayerFullscreen}
        />
      )}

      {/* 
        MAIN CONTENT ROUTING:
        1. SubscriptionSection: Dedicated VIP Wallet & Ad-Free Plans
        2. MusicSection: Dedicated Online Music Player
        3. MoviePlayPage: When watching a movie
        4. CategoryViewSection: Dedicated full page when user clicks "Show All" on a category
        5. Search / Filter View: When user searches for a title
        6. Home Feed View: Horizontal category rows
      */}
      {isSubscriptionView ? (
        <SubscriptionSection
          onBack={() => setIsSubscriptionView(false)}
          onSubscriptionStatusChange={(status) => setIsSubscribed(status)}
        />
      ) : isMusicView ? (
        <MusicSection onBack={() => setIsMusicView(false)} />
      ) : selectedMovie ? (
        <MoviePlayPage
          movie={selectedMovie}
          allMovies={movies}
          onBack={() => handleBackNavigation(false)}
          onSelectRelatedMovie={handleMoviePosterClick}
          onSelectCategory={handleOpenCategoryPage}
          onAdClick={recordAdClick}
          onFullscreenChange={setIsPlayerFullscreen}
          isSubscribed={isSubscribed}
        />
      ) : activeCategoryPage ? (
        /* DEDICATED SEPARATE CATEGORY SECTION / PAGE */
        <main className="flex-1 pb-24 animate-fadeIn">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
            
            {/* Category Page Header with Back Button */}
            <div className="bg-[#111622] border border-gray-800 rounded-2xl p-4 sm:p-5 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  id="btn-back-to-home"
                  onClick={() => handleBackNavigation(false)}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-red-600 active:scale-95 text-gray-200 hover:text-white text-xs font-bold py-2 px-3.5 rounded-xl border border-gray-700 transition-all cursor-pointer shadow"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  <span>All Movies</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-red-600 rounded-full inline-block shadow-[0_0_8px_#ef4444]" />
                  <h1 className="text-base sm:text-xl font-black text-white tracking-wide">
                    {activeCategoryPage.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-mono font-bold px-3 py-1 rounded-lg">
                  {activeCategoryMovies.length} Titles Total
                </span>
                <span className="text-gray-400 text-xs hidden sm:inline">
                  Showing {Math.min(visibleCategoryCount, activeCategoryMovies.length)} of {activeCategoryMovies.length}
                </span>
              </div>
            </div>

            {/* In-feed Start.io Native Ad (300x250px) in Category View */}
            {startIoConfig.enableNative && !isSubscribed && (
              <div className="my-5 flex justify-center">
                <StartIoNativeAd
                  variant="mrec-300x250"
                  adIndex={1}
                  onAdClick={recordAdClick}
                />
              </div>
            )}

            {/* 20-at-a-time Lazy Loaded Movie Grid - full responsive columns, no right-side dead space */}
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
              {paginatedCategoryMovies.map((movie, idx) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  layout="grid"
                  isClicked={clickedMovieId === movie.id}
                  priority={idx < 4}
                  onSelectMovie={handleMoviePosterClick}
                />
              ))}
            </div>

            {/* Scroll Sentinel for Infinite Lazy Loading 20 at a time */}
            <div ref={categoryGridEndRef} className="h-10 mt-6 flex items-center justify-center">
              {hasMoreCategoryMovies ? (
                <button
                  onClick={() => setVisibleCategoryCount((prev) => prev + GRID_BATCH_SIZE)}
                  className="bg-gray-800 hover:bg-red-600 hover:text-white border border-gray-700 text-gray-200 font-extrabold text-xs sm:text-sm py-2.5 px-6 rounded-xl transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowDownCircle className="w-4 h-4 text-red-400" />
                  <span>Scroll or Click to Load More (+20)</span>
                </button>
              ) : (
                <p className="text-xs text-gray-500 font-mono">
                  All {activeCategoryMovies.length} movies loaded in {activeCategoryPage.label}
                </p>
              )}
            </div>

          </div>
        </main>
      ) : (
        /* HOME / SEARCH VIEW */
        <main className="flex-1 pb-24">

          {/* Search Active View or Selected Category View */}
          {searchQuery.trim() !== '' || selectedCategory !== 'all' ? (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 animate-fadeIn">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {searchQuery.trim() !== ''
                      ? `Search Results for "${searchQuery}"`
                      : categoryGroups.find((g) => g.slug === selectedCategory)?.label || 'Filtered Movies'}
                    <span className="text-red-400 text-sm ml-2 font-mono">({filteredMovies.length})</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Showing {Math.min(visibleGridCount, filteredMovies.length)} of {filteredMovies.length} movies (Lazy 20/scroll)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      Show All Categories
                    </button>
                  )}
                  {searchQuery.trim() !== '' && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-red-400 font-bold hover:underline cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>

              {/* Start.io Native Ad (300x250px) in Search View */}
              {startIoConfig.enableNative && !isSubscribed && (
                <div className="my-5 flex justify-center">
                  <StartIoNativeAd
                    variant="mrec-300x250"
                    adIndex={0}
                    onAdClick={recordAdClick}
                  />
                </div>
              )}

              {filteredMovies.length === 0 ? (
                <div className="text-center py-16 bg-[#111622] rounded-2xl border border-gray-800">
                  <p className="text-gray-400 text-sm">No movies found matching "{searchQuery}"</p>
                  <button
                    onClick={handleResetHome}
                    className="mt-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    View All Movies
                  </button>
                </div>
              ) : (
                <>
                  {/* Grid - Slices 20 at a time on scroll - full responsive columns, no right-side dead space */}
                  <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 w-full">
                    {paginatedGridMovies.map((movie, idx) => (
                      <MovieCard
                        key={movie.id}
                        movie={movie}
                        layout="grid"
                        isClicked={clickedMovieId === movie.id}
                        priority={idx < 4}
                        onSelectMovie={handleMoviePosterClick}
                      />
                    ))}
                  </div>

                  {/* Scroll Sentinel for 20-batch lazy loading */}
                  <div ref={mainGridEndRef} className="mt-8 text-center">
                    {hasMoreGridMovies ? (
                      <button
                        onClick={() => setVisibleGridCount((prev) => prev + GRID_BATCH_SIZE)}
                        className="bg-gray-800 hover:bg-red-600 hover:text-white border border-gray-700 text-gray-200 font-extrabold text-xs sm:text-sm py-2.5 px-6 rounded-xl transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <ArrowDownCircle className="w-4 h-4 text-red-400" />
                        <span>Load More ({filteredMovies.length - visibleGridCount} Remaining)</span>
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 font-mono">
                        End of movies list ({filteredMovies.length} total)
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-7">
              
              {/* Prominent VIP Subscription Banner at Top of Home Feed */}
              <div
                id="banner-home-vip-subscription"
                onClick={() => {
                  setSelectedMovie(null);
                  setActiveCategoryPage(null);
                  setIsMusicView(false);
                  setIsSubscriptionView(true);
                }}
                className={`w-full rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all shadow-xl active:scale-[0.99] border-2 ${
                  isSubscribed
                    ? 'bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-[#0c1f17] border-emerald-500/70 shadow-emerald-950/40'
                    : 'bg-gradient-to-r from-[#240638] via-[#1a082c] to-[#120722] border-[#8A0EDF] shadow-purple-950/60 hover:border-[#c54bff]'
                }`}
              >
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#8A0EDF] to-amber-400 p-0.5 shrink-0 shadow-lg shadow-purple-950/50 flex items-center justify-center">
                    <div className="w-full h-full bg-[#12071f] rounded-[14px] flex items-center justify-center">
                      <Crown className="w-6 h-6 text-[#FFD700] fill-current animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white tracking-wide">
                        {isSubscribed ? 'VIP Subscription Active' : 'VIP Ad-Free Subscription (ভিআইপি প্ল্যান)'}
                      </span>
                      {isSubscribed ? (
                        <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/50">
                          100% AD-FREE
                        </span>
                      ) : (
                        <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          NO ADS
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-200/90 mt-0.5">
                      {isSubscribed
                        ? 'আপনার ভিআইপি মেম্বারশিপ সক্রিয় — সব ধরনের বিজ্ঞাপন ব্লক করা হয়েছে!'
                        : 'মোবাইল নম্বর বা ইমেইল দিয়ে লগইন করে ওয়ালেট রিচার্জ করুন এবং বিজ্ঞাপন ছাড়া মুভি দেখুন।'}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end shrink-0">
                  <button
                    type="button"
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md ${
                      isSubscribed
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-gradient-to-r from-[#8A0EDF] to-[#c54bff] text-white hover:brightness-110 shadow-purple-950/50'
                    }`}
                  >
                    <span>{isSubscribed ? 'Manage VIP' : 'Open VIP Plans 👑'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic Categories: Horizontal Rows with "Show All" opening a dedicated section */}
              {categoryGroups.map((group, groupIndex) => {
                const previewMovies = group.movies.slice(0, 10);

                return (
                  <React.Fragment key={group.slug}>
                    <section id={`section-${group.slug}`} className="relative category-section-contain">
                      <div className="flex items-center justify-between mb-3">
                        {/* Red accent bar + Title */}
                        <div className="flex items-center gap-2.5">
                          <span className="w-1.5 h-6 bg-red-600 rounded-full inline-block shadow-[0_0_8px_#ef4444]" />
                          <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                            {group.label}
                          </h2>
                          <span className="text-xs text-gray-400 font-mono bg-gray-900/80 px-2 py-0.5 rounded border border-gray-800">
                            {group.movies.length}
                          </span>
                        </div>

                        {/* "Show All" Button opens DEDICATED SEPARATE SECTION as requested */}
                        <button
                          id={`btn-show-all-${group.slug}`}
                          onClick={() => handleOpenCategoryPage(group.slug, group.label)}
                          className="flex items-center gap-1 border border-red-500/80 text-red-400 hover:bg-red-600 hover:text-white font-extrabold text-xs px-3.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <span>Show All ({group.movies.length})</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Horizontal Scrolling Row with Butter-Smooth Momentum Scrolling */}
                      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none smooth-scroll-container">
                        {previewMovies.map((movie, idx) => (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
                            layout="carousel"
                            isClicked={clickedMovieId === movie.id}
                            priority={groupIndex === 0 && idx < 4}
                            onSelectMovie={handleMoviePosterClick}
                          />
                        ))}

                        {/* End of row: "View All" card that opens dedicated category page */}
                        {group.movies.length > 10 && (
                          <div
                            onClick={() => handleOpenCategoryPage(group.slug, group.label)}
                            className="w-32 sm:w-36 shrink-0 aspect-[2/3] rounded-2xl border border-dashed border-gray-700 hover:border-red-500 bg-[#121622]/60 hover:bg-[#151c2c] flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all group"
                          >
                            <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center mb-2 transition-all">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-gray-200 group-hover:text-white">
                              View All
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5">
                              {group.movies.length} Titles
                            </span>
                          </div>
                        )}

                        {/* Blended Native Card Ad in row */}
                        {startIoConfig.enableNative && !isSubscribed && (
                          <StartIoNativeAd
                            variant="card"
                            adIndex={groupIndex % 4}
                            onAdClick={recordAdClick}
                          />
                        )}
                      </div>
                    </section>

                    {/* Inject In-feed Start.io Ad (Alternating between 300x250 Native and 300x250 Banner) every 2nd category row */}
                    {startIoConfig.enableNative && !isSubscribed && groupIndex % 2 === 1 && (
                      <div className="my-6 flex justify-center">
                        <StartIoNativeAd
                          variant="mrec-300x250"
                          adIndex={Math.floor(groupIndex / 2)}
                          onAdClick={recordAdClick}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

            </div>
          )}

        </main>
      )}

      {/* Floating Quick Access VIP Button (always visible on bottom-right so user never misses it) */}
      {!isPlayerFullscreen && !isSubscriptionView && (
        <button
          id="btn-floating-vip"
          onClick={() => {
            setSelectedMovie(null);
            setActiveCategoryPage(null);
            setIsMusicView(false);
            setIsSubscriptionView(true);
          }}
          className={`fixed z-40 right-3.5 bottom-16 sm:bottom-16 flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full border shadow-2xl transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
            isSubscribed
              ? 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300 shadow-emerald-950/60'
              : 'bg-gradient-to-r from-[#8A0EDF] via-[#9e1beb] to-[#c54bff] border-purple-200 text-white shadow-purple-950/80 hover:brightness-110 ring-2 ring-purple-500/40'
          }`}
          title="Open VIP Ad-Free Subscription"
        >
          <Crown className="w-4 h-4 text-[#FFD700] fill-current shrink-0" />
          <span className="text-xs font-black tracking-wide">
            {isSubscribed ? 'VIP Active' : 'VIP 👑'}
          </span>
        </button>
      )}

      {/* Sticky Bottom Start.io Banner Ad (Hidden when video is playing in fullscreen or in Subscription section or user is VIP subscribed) */}
      {startIoConfig.enableBanner && !isSubscribed && !isPlayerFullscreen && !isSubscriptionView && (
        <StartIoBannerAd
          position="bottom"
          appId={startIoConfig.appId}
          onAdClick={recordAdClick}
          onAdImpression={recordBannerImpression}
        />
      )}

      {/* In-App Auto Update Modal */}
      {showUpdateModal && appUpdateData && (
        <AutoUpdateModal
          isOpen={showUpdateModal}
          updateData={appUpdateData}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Update Check Feedback Toast */}
      {updateToastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#121927] border border-cyan-500/40 text-cyan-300 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl shadow-cyan-950/60 flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{updateToastMessage}</span>
        </div>
      )}

    </div>
  );
}
