import BUNDLED_CATALOG from './data/userCatalog8468988.json';
import CURATED_CLOUD_CATALOG from './data/curatedCloudCatalog.json';
import {
    subscriptionDb,
    sanitizeSubscriptionId,
    checkAndHandleSubscriptionExpiry,
    getCachedIsSubscribed,
    SUBSCRIPTION_PLANS,
    loginOrRegisterSubscriptionUser,
    paySubscriptionFromWallet,
    logoutSubscriptionUser
} from './services/subscriptionService';
import { ref, get } from 'firebase/database';

// ==========================================
// VIP SUBSCRIPTION & 100% AD-FREE ENGINE
// ==========================================
let isInSubscriptionView = false;
let homeCachedHTML = "";
let adRefreshTimer = null;
let isSmartlinkInterstitialActive = false;
let isPopunderActive = false;
window.__isVipSubscribed = getCachedIsSubscribed();

async function refreshSubscriptionState() {
    const safeId = localStorage.getItem('sub_wallet_safe_id');
    if (safeId) {
        try {
            const res = await checkAndHandleSubscriptionExpiry(safeId);
            window.__isVipSubscribed = res.isSubscribed;
        } catch (e) {
            window.__isVipSubscribed = getCachedIsSubscribed();
        }
    } else {
        window.__isVipSubscribed = getCachedIsSubscribed();
    }
    updateVipAdSuppression();
}
setInterval(refreshSubscriptionState, 15000);
setTimeout(refreshSubscriptionState, 500);
window.addEventListener('DOMContentLoaded', updateVipAdSuppression);
updateVipAdSuppression();

function updateVipAdSuppression() {
    const isVip = !!window.__isVipSubscribed;

    if (isVip) {
        if (document.body) document.body.classList.add('vip-active');
        if (document.documentElement) document.documentElement.classList.add('vip-active');

        // Immediately remove and purge all ad elements from the DOM
        if (typeof document !== 'undefined') {
            const adElements = document.querySelectorAll('.ad-slot-300x250, .ad-label, #fixedFooterAdContainer, #playerUnderAdSlot, .interstitial-modal, #smartlinkInterstitialModal, #popunderInterstitialModal');
            adElements.forEach(el => {
                try {
                    if (el.id === 'fixedFooterAdContainer') {
                        el.style.display = 'none';
                        const inner = document.getElementById('fixedFooterAdInner');
                        if (inner) inner.innerHTML = '';
                    } else if (el.id === 'playerUnderAdSlot') {
                        el.innerHTML = '';
                        const parent = el.closest('.ad-slot-300x250');
                        if (parent) parent.remove();
                    } else {
                        el.remove();
                    }
                } catch (e) {
                    el.style.display = 'none';
                }
            });
        }

        // Invalidate cached home HTML so non-VIP cached ads can never be re-injected
        homeCachedHTML = "";

        // Cancel ad refresh timer
        if (adRefreshTimer) {
            clearTimeout(adRefreshTimer);
            adRefreshTimer = null;
        }

        // Close any active interstitial
        if (typeof closeSmartlinkInterstitial === 'function' && isSmartlinkInterstitialActive) {
            closeSmartlinkInterstitial();
        }
        if (typeof closePopunderInterstitial === 'function' && isPopunderActive) {
            closePopunderInterstitial();
        }
    } else {
        if (document.body) document.body.classList.remove('vip-active');
        if (document.documentElement) document.documentElement.classList.remove('vip-active');
        const footerAd = document.getElementById('fixedFooterAdContainer');
        if (footerAd) {
            footerAd.style.display = 'flex';
        }
    }

    // Update VIP menu item in dropdown
    const vipItem = document.getElementById('vipMenuItem');
    const vipText = document.getElementById('vipMenuText');
    const vipBadge = document.getElementById('vipMenuBadge');
    if (vipItem && vipText && vipBadge) {
        if (isVip) {
            vipItem.classList.add('active');
            vipText.innerHTML = '<i class="fa-solid fa-shield-halved" style="color: #34d399; margin-right: 8px;"></i> VIP Subscription Active';
            vipBadge.textContent = 'ACTIVE';
            vipBadge.className = 'vip-badge-pill active';
        } else {
            vipItem.classList.remove('active');
            vipText.innerHTML = '<i class="fa-solid fa-crown" style="color: #FFD700; margin-right: 8px;"></i> VIP Subscription (No Ads)';
            vipBadge.textContent = 'VIP';
            vipBadge.className = 'vip-badge-pill';
        }
    }
}
window.updateVipAdSuppression = updateVipAdSuppression;

// ==========================================
// CHROME APP OPENER (SMARTLINK & ADS)
// ==========================================
window.openInChrome = function(url) {
    if (!url) return;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isInsideIframe = window.self !== window.top;
    if (isAndroid && !isInsideIframe) {
        try {
            const cleanUrl = url.replace(/^https?:\/\//, '');
            const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
            window.location.href = intentUrl;
            return;
        } catch (e) {}
    }
    try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        try {
            window.open(url, '_blank');
        } catch (err) {}
    }
};

// ==========================================
// KEEP SCREEN ALWAYS ON & TRUE FULLSCREEN (WAKE LOCK + STATUS BAR HIDE)
// ==========================================
let appWakeLockSentinel = null;

async function requestContinuousWakeLock() {
    // 1. Android APK Native Bridge (Keep screen awake & Hide System Navigation Bars)
    if (window.Android) {
        try {
            if (typeof window.Android.keepScreenOn === 'function') {
                window.Android.keepScreenOn(true);
            }
            if (typeof window.Android.hideSystemBars === 'function') {
                window.Android.hideSystemBars();
            }
        } catch (e) {}
    }

    // 2. Hide Capacitor Status Bar & Navigation Bar dynamically on app load/visibility
    try {
        const { StatusBar } = await import('@capacitor/status-bar');
        if (StatusBar) {
            await StatusBar.hide().catch(() => {});
            await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        }
    } catch (e) {}

    try {
        const { NavigationBar } = await import('@capawesome/capacitor-navigation-bar');
        if (NavigationBar) {
            await NavigationBar.hide().catch(() => {});
        }
    } catch (e) {}

    try {
        const { Fullscreen } = await import('@boengli/capacitor-fullscreen');
        if (Fullscreen) {
            await Fullscreen.activateImmersiveMode().catch(() => {});
        }
    } catch (e) {}

    // 3. Web Screen Wake Lock API
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function') {
        try {
            if (!appWakeLockSentinel || appWakeLockSentinel.released) {
                appWakeLockSentinel = await navigator.wakeLock.request('screen');
                appWakeLockSentinel.addEventListener('release', () => {
                    appWakeLockSentinel = null;
                });
            }
        } catch (err) {
            // Tab is inactive or battery policy restricted
        }
    }
}

// Ensure screen stays awake while app is open
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            requestContinuousWakeLock();
        }
    });
    window.addEventListener('DOMContentLoaded', requestContinuousWakeLock);
    window.addEventListener('load', requestContinuousWakeLock);
    document.addEventListener('click', requestContinuousWakeLock, { passive: true });
    document.addEventListener('touchstart', requestContinuousWakeLock, { passive: true });
    // Initial triggers
    requestContinuousWakeLock();
    setTimeout(requestContinuousWakeLock, 800);
}

let dbCache;
const DB_NAME = "MoviePosterDB";
const DB_VERSION = 2;

const openDB = () => {
    return new Promise((resolve) => {
        if (dbCache) return resolve(dbCache);
        if (typeof window === 'undefined' || !window.indexedDB) {
            return resolve(null);
        }
        try {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                try {
                    let db = e.target.result;
                    if (!db.objectStoreNames.contains("images")) {
                        db.createObjectStore("images");
                    }
                    if (!db.objectStoreNames.contains("catalog")) {
                        db.createObjectStore("catalog");
                    }
                } catch (err) {}
            };
            request.onsuccess = (e) => {
                dbCache = e.target.result;
                resolve(dbCache);
            };
            request.onerror = () => {
                dbCache = null;
                resolve(null);
            };
            request.onblocked = () => {
                dbCache = null;
                resolve(null);
            };
        } catch (err) {
            dbCache = null;
            resolve(null);
        }
    });
};

async function getCachedMoviesFromDB() {
    // 1. Check openDB IndexedDB catalog store
    const dbMovies = await new Promise((resolve) => {
        if (!dbCache) return resolve(null);
        try {
            if (!dbCache.objectStoreNames.contains("catalog")) return resolve(null);
            const tx = dbCache.transaction("catalog", "readonly");
            const store = tx.objectStore("catalog");
            const req = store.get("cached_movies_list");
            req.onsuccess = () => {
                if (Array.isArray(req.result) && req.result.length > 0) {
                    resolve(req.result);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });

    if (dbMovies && dbMovies.length > 0) return dbMovies;

    // 2. Fallback to localStorage
    try {
        const stored = localStorage.getItem("vdosky_offline_catalog");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    return null;
}

async function saveMoviesToDB(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;
    try {
        localStorage.setItem("vdosky_offline_catalog", JSON.stringify(movies.slice(0, 1500)));
    } catch (e) {}

    if (!dbCache) return;
    try {
        if (!dbCache.objectStoreNames.contains("catalog")) return;
        const tx = dbCache.transaction("catalog", "readwrite");
        const store = tx.objectStore("catalog");
        store.put(movies, "cached_movies_list");
    } catch (err) {
        console.warn("Could not save movies to openDB:", err);
    }
}

async function getCachedImage(url) {
    return new Promise((resolve) => {
        if (!dbCache) return resolve(null);
        try {
            const tx = dbCache.transaction("images", "readonly");
            const store = tx.objectStore("images");
            const req = store.get(url);
            req.onsuccess = () => {
                if (req.result) {
                    resolve(URL.createObjectURL(req.result));
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function saveImage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const tx = dbCache.transaction("images", "readwrite");
        const store = tx.objectStore("images");
        store.put(blob, url);
        return URL.createObjectURL(blob);
    } catch {
        return url;
    }
}

async function getImage(url) {
    const cached = await getCachedImage(url);
    if (cached) return cached;
    return await saveImage(url);
}

let allMovies = [];
let isInCategoryView = false;
let isPlayerView = false;
let isInCloudStreamView = false;
let currentPlayingMovie = null;
let currentCategoryName = "all";
let savedScrollPosition = 0;

// Show Toast Notification
function showToast(msg) {
    const toast = document.getElementById('toastNotice');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2500);
}
window.showToast = showToast;

const GITHUB_LIVE_MOVIES_URL = "https://raw.githubusercontent.com/appcreator05/post/refs/heads/main/8468988.json";

// Live sync from user's GitHub repository
async function fetchJsonFromEndpoint(url) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        try { abortController.abort(); } catch (e) {}
    }, 6000);

    try {
        // Simple CORS request: No custom headers like Cache-Control/Pragma to avoid 403 Forbidden on raw.githubusercontent.com
        const response = await fetch(url, {
            signal: abortController.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        // If GitHub API contents endpoint is used, decode base64
        if (url.includes("api.github.com")) {
            const apiRes = await response.json();
            if (apiRes && apiRes.content) {
                const decoded = atob(apiRes.content.replace(/\s/g, ''));
                const parsed = JSON.parse(decoded);
                return Array.isArray(parsed) ? parsed : null;
            }
            return null;
        }

        const data = await response.json();
        return Array.isArray(data) ? data : null;
    } catch (e) {
        clearTimeout(timeoutId);
        return null;
    }
}

async function syncMoviesFromGitHub(isManual = false) {
    const cacheBuster = `_t=${Date.now()}`;
    const REMOTE_ENDPOINTS = [
        `https://raw.githubusercontent.com/appcreator05/post/refs/heads/main/8468988.json?${cacheBuster}`,
        `https://raw.githubusercontent.com/appcreator05/post/main/8468988.json?${cacheBuster}`,
        `https://api.github.com/repos/appcreator05/post/contents/8468988.json?${cacheBuster}`
    ];

    for (const endpoint of REMOTE_ENDPOINTS) {
        try {
            const freshMovies = await fetchJsonFromEndpoint(endpoint);
            if (freshMovies && Array.isArray(freshMovies) && freshMovies.length > 0) {
                const countDiff = freshMovies.length - (allMovies ? allMovies.length : 0);
                const isFirstDiff = allMovies && allMovies.length > 0 && (
                    freshMovies[0]?.title !== allMovies[0]?.title ||
                    freshMovies[0]?.video !== allMovies[0]?.video ||
                    freshMovies[0]?.yt !== allMovies[0]?.yt
                );
                const isLastDiff = allMovies && allMovies.length > 0 && (
                    freshMovies[freshMovies.length - 1]?.title !== allMovies[allMovies.length - 1]?.title
                );
                const hasChanged = (countDiff !== 0) || isFirstDiff || isLastDiff || isManual;

                allMovies = freshMovies;
                saveMoviesToDB(freshMovies);

                if (hasChanged) {
                    if (!isPlayerView) {
                        if (isInCategoryView) {
                            renderCategoryView(currentCategoryName);
                        } else {
                            await renderContent(allMovies);
                        }
                    }
                    if (countDiff > 0) {
                        showToast(`Updated: ${countDiff} new movie${countDiff > 1 ? 's' : ''} synced!`);
                    } else if (isManual) {
                        showToast(`Synced ${freshMovies.length} movies live from GitHub!`);
                    }
                }
                return true;
            }
        } catch (endpointErr) {
            console.warn(`Fetch error for ${endpoint}:`, endpointErr);
        }
    }
    return false;
}

window.syncMoviesFromGitHub = syncMoviesFromGitHub;
window.refreshMoviesFromGitHub = function(showFeedback = true) {
    if (showFeedback) showToast("Checking GitHub for new posts...");
    return syncMoviesFromGitHub(true);
};

async function fetchMovies() {
    let hasLoadedAndRendered = false;

    try {
        await openDB();

        // 1. Instant Initial Load: Compare cached DB with bundled catalog
        const cachedFromDB = await getCachedMoviesFromDB();
        let initialMovies = BUNDLED_CATALOG;

        // If cached DB has strictly more movies than bundled catalog, use it
        if (cachedFromDB && Array.isArray(cachedFromDB) && cachedFromDB.length > (BUNDLED_CATALOG ? BUNDLED_CATALOG.length : 0)) {
            initialMovies = cachedFromDB;
        } else if (BUNDLED_CATALOG && Array.isArray(BUNDLED_CATALOG) && BUNDLED_CATALOG.length > 0) {
            // Bundled catalog is fresh and has all latest movies (including Robin Hood 2018)
            initialMovies = BUNDLED_CATALOG;
            saveMoviesToDB(BUNDLED_CATALOG);
        }

        if (initialMovies && Array.isArray(initialMovies) && initialMovies.length > 0) {
            allMovies = initialMovies;
            hasLoadedAndRendered = true;
            await renderContent(allMovies);
            const spinner = document.getElementById('globalSpinner');
            if (spinner) spinner.style.display = 'none';
        }

        // 2. Direct Live Fetch from User GitHub JSON (with cache buster and multi-mirror fallback)
        await syncMoviesFromGitHub(false);

    } catch (err) {
        console.warn("Error in fetchMovies:", err);
        if (!hasLoadedAndRendered && BUNDLED_CATALOG && BUNDLED_CATALOG.length > 0) {
            allMovies = BUNDLED_CATALOG;
            await renderContent(allMovies);
        }
    } finally {
        const spinner = document.getElementById('globalSpinner');
        if (spinner) spinner.style.display = 'none';
    }
}

let currentPlyrInstance = null;
let currentActiveServerIndex = 0;
let currentYtPlayerInstance = null;
let autoNextTimer = null;
let isAutoNextEnabled = true;
try {
    const savedAutoNext = localStorage.getItem('vdosky_auto_next');
    if (savedAutoNext !== null) {
        isAutoNextEnabled = (savedAutoNext !== 'false');
    }
} catch (e) {}

let currentCloudFilteredList = [];

// PostMessage listener for YouTube iframe video ended event
window.addEventListener('message', (event) => {
    if (!event || !event.data) return;
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data) {
            if ((data.event === 'onStateChange' || data.type === 'onStateChange') && (data.info === 0 || data.data === 0 || data.info === '0' || data.data === '0')) {
                handleVideoEnded();
            }
        }
    } catch (e) {}
});

function destroyCurrentPlyr() {
    unlockScreenOrientation();
    if (autoNextTimer) {
        clearInterval(autoNextTimer);
        autoNextTimer = null;
    }
    const overlay = document.getElementById('playerEndedOverlay');
    if (overlay) overlay.remove();

    if (currentYtPlayerInstance) {
        try {
            if (typeof currentYtPlayerInstance.destroy === 'function') {
                currentYtPlayerInstance.destroy();
            }
        } catch (e) {}
        currentYtPlayerInstance = null;
    }
    if (currentPlyrInstance) {
        try {
            currentPlyrInstance.destroy();
        } catch (e) {
            console.warn("Error destroying Plyr instance:", e);
        }
        currentPlyrInstance = null;
    }
}

function getNextPlayableItem() {
    if (!currentPlayingMovie) return null;

    if (isInCloudStreamView) {
        const list = (currentCloudFilteredList && currentCloudFilteredList.length > 0) 
            ? currentCloudFilteredList 
            : (typeof CURATED_CLOUD_CATALOG !== 'undefined' ? CURATED_CLOUD_CATALOG : []);
        if (list.length === 0) return null;
        
        const currentIdx = list.findIndex(item => (item.yt && item.yt === currentPlayingMovie.yt) || item.title === currentPlayingMovie.title);
        if (currentIdx !== -1) {
            return list[(currentIdx + 1) % list.length];
        }
        return list[0];
    } else {
        const sameCat = allMovies.filter(m => m.category === currentPlayingMovie.category && m.title !== currentPlayingMovie.title);
        if (sameCat.length > 0) {
            return sameCat[0];
        }
        const globalIdx = allMovies.findIndex(m => m.title === currentPlayingMovie.title);
        if (globalIdx !== -1 && allMovies.length > 1) {
            return allMovies[(globalIdx + 1) % allMovies.length];
        }
        return allMovies[0] || null;
    }
}

function handleVideoEnded() {
    if (autoNextTimer) {
        clearInterval(autoNextTimer);
        autoNextTimer = null;
    }
    
    const box = document.getElementById('activePlayerBox');
    if (!box) return;

    const nextItem = getNextPlayableItem();
    if (!nextItem) return;

    const existingOverlay = document.getElementById('playerEndedOverlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'playerEndedOverlay';
    overlay.className = 'player-ended-overlay';

    const nextTitle = nextItem.title || nextItem.name || 'Next Video';

    if (isAutoNextEnabled) {
        let countdown = 2;
        overlay.innerHTML = `
            <div class="player-ended-card">
                <div class="player-ended-badge"><i class="fa-solid fa-forward-step"></i> Auto Next</div>
                <div class="player-ended-next-title">${nextTitle}</div>
                <div class="player-ended-timer-ring">Playing next in <span id="autoNextCount" class="player-ended-timer-count">${countdown}</span>s...</div>
                <div class="player-ended-buttons">
                    <button class="ended-btn-primary" onclick="playNextVideo(true)">
                        <i class="fa-solid fa-play"></i> Play Now
                    </button>
                    <button class="ended-btn-secondary" onclick="cancelAutoNext()">
                        <i class="fa-solid fa-xmark"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        box.appendChild(overlay);

        const countEl = document.getElementById('autoNextCount');
        const interval = setInterval(() => {
            countdown--;
            if (countEl) countEl.innerText = countdown;
            if (countdown <= 0) {
                clearInterval(interval);
                autoNextTimer = null;
                playNextVideo(true);
            }
        }, 1000);

        autoNextTimer = interval;
    } else {
        overlay.innerHTML = `
            <div class="player-ended-card">
                <div class="player-ended-badge"><i class="fa-solid fa-circle-check"></i> Stream Finished</div>
                <div class="player-ended-next-title">${nextTitle}</div>
                <div class="player-ended-buttons">
                    <button class="ended-btn-primary" onclick="playNextVideo(true)">
                        <i class="fa-solid fa-forward-step"></i> Play Next
                    </button>
                    <button class="ended-btn-secondary" onclick="replayCurrentVideo()">
                        <i class="fa-solid fa-rotate-left"></i> Replay
                    </button>
                </div>
            </div>
        `;
        box.appendChild(overlay);
    }
}

window.playNextVideo = function(immediate = false) {
    if (autoNextTimer) {
        clearInterval(autoNextTimer);
        autoNextTimer = null;
    }
    const overlay = document.getElementById('playerEndedOverlay');
    if (overlay) overlay.remove();

    const nextItem = getNextPlayableItem();
    if (!nextItem) {
        showToast("No next video in queue");
        return;
    }

    if (isInCloudStreamView) {
        playCloudStreamVideo(nextItem);
    } else {
        window.openPlayer(nextItem);
    }
    showToast("Playing next: " + (nextItem.title || nextItem.name || 'Stream'));
};

window.cancelAutoNext = function() {
    if (autoNextTimer) {
        clearInterval(autoNextTimer);
        autoNextTimer = null;
    }
    const overlay = document.getElementById('playerEndedOverlay');
    if (overlay) {
        const nextItem = getNextPlayableItem();
        const nextTitle = nextItem ? (nextItem.title || nextItem.name) : 'Next Stream';
        overlay.innerHTML = `
            <div class="player-ended-card">
                <div class="player-ended-badge"><i class="fa-solid fa-circle-check"></i> Stream Finished</div>
                <div class="player-ended-next-title">${nextTitle}</div>
                <div class="player-ended-buttons">
                    <button class="ended-btn-primary" onclick="playNextVideo(true)">
                        <i class="fa-solid fa-forward-step"></i> Play Next
                    </button>
                    <button class="ended-btn-secondary" onclick="replayCurrentVideo()">
                        <i class="fa-solid fa-rotate-left"></i> Replay
                    </button>
                </div>
            </div>
        `;
    }
};

window.replayCurrentVideo = function() {
    const overlay = document.getElementById('playerEndedOverlay');
    if (overlay) overlay.remove();

    if (currentYtPlayerInstance && typeof currentYtPlayerInstance.seekTo === 'function') {
        try {
            currentYtPlayerInstance.seekTo(0, true);
            currentYtPlayerInstance.playVideo();
            return;
        } catch (e) {}
    }
    if (currentPlyrInstance) {
        try {
            currentPlyrInstance.currentTime = 0;
            currentPlyrInstance.play();
            return;
        } catch (e) {}
    }
    if (currentPlayingMovie) {
        renderPlayerSection(currentPlayingMovie, currentActiveServerIndex);
    }
};

window.toggleAutoNext = function(forceVal) {
    if (typeof forceVal === 'boolean') {
        isAutoNextEnabled = forceVal;
    } else {
        isAutoNextEnabled = !isAutoNextEnabled;
    }
    try {
        localStorage.setItem('vdosky_auto_next', isAutoNextEnabled ? 'true' : 'false');
    } catch (e) {}

    updateAutoNextUI();
    showToast(isAutoNextEnabled ? "Auto Next: Enabled" : "Auto Next: Disabled");
};

function updateAutoNextUI() {
    document.querySelectorAll('.auto-next-pill-btn').forEach(btn => {
        btn.classList.toggle('active', isAutoNextEnabled);
        const textSpan = btn.querySelector('strong');
        if (textSpan) textSpan.innerText = isAutoNextEnabled ? 'ON' : 'OFF';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = `fa-solid ${isAutoNextEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}`;
        }
    });
}

function setupYouTubePlayer(iframeId) {
    if (currentYtPlayerInstance) {
        try {
            if (typeof currentYtPlayerInstance.destroy === 'function') {
                currentYtPlayerInstance.destroy();
            }
        } catch (e) {}
        currentYtPlayerInstance = null;
    }

    const onPlayerStateChange = (event) => {
        if (event && (event.data === 0 || (window.YT && event.data === window.YT.PlayerState.ENDED))) {
            handleVideoEnded();
        }
    };

    function attachYt() {
        const el = document.getElementById(iframeId);
        if (!el) return;
        try {
            currentYtPlayerInstance = new window.YT.Player(iframeId, {
                events: {
                    'onStateChange': onPlayerStateChange
                }
            });
        } catch (e) {
            console.warn('YT Player attachment warning:', e);
        }
    }

    if (window.YT && window.YT.Player) {
        attachYt();
    } else {
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() {
            if (typeof prevReady === 'function') prevReady();
            attachYt();
        };
    }
}

// Detect video source ("video", "yt", or "drc")
function detectMovieVideoSource(movie) {
    if (!movie) {
        return {
            type: 'drc',
            id: 'default',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            raw: ''
        };
    }

    // 1. Check "yt" key (e.g. "yt": "hf-EHqaybqI")
    const rawYt = (movie.yt || movie.youtube || "").trim();
    if (rawYt) {
        let ytId = rawYt;
        const match = rawYt.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (match && match[1]) {
            ytId = match[1];
        }
        return {
            type: 'yt',
            id: ytId,
            url: `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1&iv_load_policy=3&modestbranding=1`,
            raw: rawYt
        };
    }

    // 2. Check "drc" key (e.g. "drc": "https://github.com/movieapp05/sps/releases/download/dsp/vdo3.mp4")
    const rawDrc = (movie.drc || movie.direct || "").trim();
    if (rawDrc) {
        return {
            type: 'drc',
            id: rawDrc,
            url: rawDrc,
            raw: rawDrc
        };
    }

    // 3. Check "video" key (e.g. "video": "1DlvdGn8QaXGuJVbeU6wrKxGUJfV-0Txh0")
    const rawVideo = (movie.video || movie.videoUrl || movie.streamUrl || movie.link || movie.url || "").trim();
    if (rawVideo) {
        // If it's a YouTube link inside "video"
        if (rawVideo.includes('youtube.com') || rawVideo.includes('youtu.be')) {
            const match = rawVideo.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
            const ytId = match ? match[1] : rawVideo;
            return {
                type: 'yt',
                id: ytId,
                url: `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1&iv_load_policy=3&modestbranding=1`,
                raw: rawVideo
            };
        }

        // If it's direct HTTP/HTTPS URL
        if (rawVideo.startsWith('http://') || rawVideo.startsWith('https://')) {
            const workerMatch = rawVideo.match(/id=([-\w]{25,})/);
            if (workerMatch && workerMatch[1]) {
                const driveId = workerMatch[1];
                return {
                    type: 'video',
                    id: driveId,
                    url: `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(driveId)}`,
                    raw: rawVideo
                };
            }
            return {
                type: 'drc',
                id: rawVideo,
                url: rawVideo,
                raw: rawVideo
            };
        }

        // Otherwise it is a Google Drive file ID (e.g. "1DlvdGn8QaXGuJVbeU6wrKxGUJfV-0Txh0")
        let cleanId = rawVideo;
        const match = rawVideo.match(/[-\w]{25,}/);
        if (match) {
            cleanId = match[0];
        }
        return {
            type: 'video',
            id: cleanId,
            url: `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(cleanId)}`,
            raw: rawVideo
        };
    }

    // Default fallback
    return {
        type: 'drc',
        id: 'default',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        raw: ''
    };
}

// Generate Stream URLs based on detected video type ("video", "yt", or "drc")
function getMovieServers(movie) {
    const source = detectMovieVideoSource(movie);

    if (source.type === 'yt') {
        const originParam = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) 
            ? `&origin=${encodeURIComponent(window.location.origin)}` 
            : '';
        return [
            {
                name: "Server 1 (Cloud HD Player)",
                quality: "Auto / 1080p",
                url: `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1${originParam}`,
                type: "yt"
            },
            {
                name: "Server 2 (Fast Stream)",
                quality: "720p HD",
                url: `https://www.youtube.com/embed/${source.id}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1${originParam}`,
                type: "yt"
            }
        ];
    }

    if (source.type === 'drc') {
        return [
            {
                name: "Server 1 (Direct HD Stream)",
                quality: "1080p Ultra HD",
                url: source.url,
                type: "drc"
            },
            {
                name: "Server 2 (Direct Fast Stream)",
                quality: "720p HD",
                url: source.url,
                type: "drc"
            },
            {
                name: "Server 3 (Backup Stream)",
                quality: "480p SD",
                url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                type: "drc"
            }
        ];
    }

    // Default "video" (Google Drive stream through worker)
    const cleanId = source.id;
    return [
        {
            name: "Server 1 (Fast Worker Stream)",
            quality: "1080p Ultra HD",
            url: `https://debasis.installapkapps.workers.dev/?id=${encodeURIComponent(cleanId)}`,
            type: "video"
        },
        {
            name: "Server 2 (Drive Direct HD)",
            quality: "720p HD",
            url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(cleanId)}`,
            type: "video"
        },
        {
            name: "Server 3 (Docs Stream)",
            quality: "Auto Quality",
            url: `https://docs.google.com/uc?export=open&id=${encodeURIComponent(cleanId)}`,
            type: "video"
        },
        {
            name: "Server 4 (Backup Stream)",
            quality: "480p SD",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            type: "video"
        }
    ];
}

// Screen Orientation Landscape Lock & Unlock on Fullscreen
async function tryNativeOrientationLock() {
    // 1. Android APK native interface
    if (window.Android && typeof window.Android.setLandscape === 'function') {
        try {
            window.Android.setLandscape();
            return true;
        } catch (e) {}
    }
    if (window.Android && typeof window.Android.setOrientation === 'function') {
        try {
            window.Android.setOrientation('landscape');
            return true;
        } catch (e) {}
    }

    // 2. Screen Orientation API (Modern mobile browsers)
    const targets = ['landscape', 'landscape-primary', 'landscape-secondary'];
    for (const orient of targets) {
        try {
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                await screen.orientation.lock(orient);
                return true;
            }
        } catch (err) {}
    }

    // 3. Legacy vendor prefixes
    try {
        const so = screen;
        if (so.lockOrientation && so.lockOrientation('landscape')) return true;
        if (so.mozLockOrientation && so.mozLockOrientation('landscape')) return true;
        if (so.msLockOrientation && so.msLockOrientation('landscape')) return true;
        if (so.webkitLockOrientation && so.webkitLockOrientation('landscape')) return true;
    } catch (e) {}

    return false;
}

function applyCssLandscapeIfPortrait() {
    const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (currentPlyrInstance && currentPlyrInstance.fullscreen && currentPlyrInstance.fullscreen.active)
    );
    const playerBox = document.getElementById('activePlayerBox');
    const plyrContainer = currentPlyrInstance?.elements?.container || playerBox;

    if (isFs && window.innerHeight > window.innerWidth) {
        if (plyrContainer) plyrContainer.classList.add('plyr-force-landscape');
        if (playerBox) playerBox.classList.add('plyr-force-landscape');
    } else {
        if (plyrContainer) plyrContainer.classList.remove('plyr-force-landscape');
        if (playerBox) playerBox.classList.remove('plyr-force-landscape');
    }
}

async function lockLandscapeOrientation() {
    // Immediate attempt on user gesture
    let locked = await tryNativeOrientationLock();

    // Fullscreen transitions are asynchronous on mobile devices (100-300ms).
    // Retry native orientation lock as fullscreen activates:
    const delays = [60, 150, 300, 500];
    delays.forEach(delay => {
        setTimeout(async () => {
            if (!locked) {
                locked = await tryNativeOrientationLock();
            }
            // If device is still in portrait orientation, apply CSS landscape rotation fallback
            if (window.innerHeight > window.innerWidth) {
                applyCssLandscapeIfPortrait();
            } else {
                const playerBox = document.getElementById('activePlayerBox');
                const plyrContainer = currentPlyrInstance?.elements?.container || playerBox;
                if (plyrContainer) plyrContainer.classList.remove('plyr-force-landscape');
                if (playerBox) playerBox.classList.remove('plyr-force-landscape');
            }
        }, delay);
    });
}

function unlockScreenOrientation() {
    // 1. Android APK native interface
    if (window.Android && typeof window.Android.unlockOrientation === 'function') {
        try { window.Android.unlockOrientation(); } catch (e) {}
    } else if (window.Android && typeof window.Android.setPortrait === 'function') {
        try { window.Android.setPortrait(); } catch (e) {}
    }

    // 2. Remove CSS rotation
    const playerBox = document.getElementById('activePlayerBox');
    const plyrContainer = currentPlyrInstance?.elements?.container || playerBox;
    if (plyrContainer) plyrContainer.classList.remove('plyr-force-landscape');
    if (playerBox) playerBox.classList.remove('plyr-force-landscape');

    // 3. Screen orientation unlock
    try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
            screen.orientation.unlock();
            return;
        }
    } catch (e) {}

    try {
        const so = screen;
        if (so.unlockOrientation) so.unlockOrientation();
        else if (so.mozUnlockOrientation) so.mozUnlockOrientation();
        else if (so.msUnlockOrientation) so.msUnlockOrientation();
        else if (so.webkitUnlockOrientation) so.webkitUnlockOrientation();
    } catch (e) {}
}

// Global Fullscreen Event Listeners for Automatic Landscape Orientation
const handleGlobalFullscreenOrientation = () => {
    // Retain landscape orientation if Smartlink interstitial ad is active over fullscreen
    if (isSmartlinkInterstitialActive && wasFullscreenBeforeInterstitial) {
        return;
    }
    const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (currentPlyrInstance && currentPlyrInstance.fullscreen && currentPlyrInstance.fullscreen.active)
    );
    if (isFs) {
        lockLandscapeOrientation();
    } else {
        unlockScreenOrientation();
    }
};

document.addEventListener('fullscreenchange', handleGlobalFullscreenOrientation);
document.addEventListener('webkitfullscreenchange', handleGlobalFullscreenOrientation);
document.addEventListener('mozfullscreenchange', handleGlobalFullscreenOrientation);
document.addEventListener('MSFullscreenChange', handleGlobalFullscreenOrientation);

window.addEventListener('resize', () => {
    const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (currentPlyrInstance && currentPlyrInstance.fullscreen && currentPlyrInstance.fullscreen.active)
    );
    if (isFs) {
        if (window.innerWidth > window.innerHeight) {
            const playerBox = document.getElementById('activePlayerBox');
            const plyrContainer = currentPlyrInstance?.elements?.container || playerBox;
            if (plyrContainer) plyrContainer.classList.remove('plyr-force-landscape');
            if (playerBox) playerBox.classList.remove('plyr-force-landscape');
        } else {
            applyCssLandscapeIfPortrait();
        }
    }
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        const playerBox = document.getElementById('activePlayerBox');
        const plyrContainer = currentPlyrInstance?.elements?.container || playerBox;
        if (window.innerWidth > window.innerHeight) {
            if (plyrContainer) plyrContainer.classList.remove('plyr-force-landscape');
            if (playerBox) playerBox.classList.remove('plyr-force-landscape');
        }
    }, 200);
});

// Initialize Plyr player on HTML5 video element
function initPlyrPlayer(videoEl, movie, activeServerIndex) {
    destroyCurrentPlyr();
    if (!videoEl) return;

    const PlyrConstructor = window.Plyr;
    if (!PlyrConstructor) {
        console.warn("Plyr not found on window, fallback to native video controls");
        videoEl.controls = true;
        return;
    }

    try {
        currentPlyrInstance = new PlyrConstructor(videoEl, {
            controls: [
                'play-large',
                'rewind',
                'play',
                'fast-forward',
                'progress',
                'current-time',
                'duration',
                'mute',
                'volume',
                'captions',
                'fullscreen'
            ],
            settings: [],
            seekTime: 10,
            keyboard: { focused: true, global: false },
            tooltips: { controls: true, seek: true },
            fullscreen: { enabled: true, fallback: true, iosNative: true }
        });

        // Intercept user click on Plyr's fullscreen icon button during user activation
        currentPlyrInstance.on('ready', () => {
            const container = currentPlyrInstance.elements.container;
            if (container) {
                container.style.position = 'relative';

                // Inject central buffering spinner directly inside Plyr container (visible in normal & fullscreen)
                let bufferOverlay = container.querySelector('.plyr-buffering-overlay');
                if (!bufferOverlay) {
                    bufferOverlay = document.createElement('div');
                    bufferOverlay.className = 'plyr-buffering-overlay';
                    bufferOverlay.style.display = 'none';
                    bufferOverlay.innerHTML = `
                        <div class="plyr-buffer-spinner-ring"></div>
                        <span class="plyr-buffer-text">Buffering Stream...</span>
                    `;
                    container.appendChild(bufferOverlay);
                }

                const showBuffering = () => {
                    if (bufferOverlay) bufferOverlay.style.display = 'flex';
                };
                const hideBuffering = () => {
                    if (bufferOverlay) bufferOverlay.style.display = 'none';
                };

                // Plyr seek & buffering events
                currentPlyrInstance.on('seeking', showBuffering);
                currentPlyrInstance.on('waiting', showBuffering);
                currentPlyrInstance.on('loadstart', showBuffering);
                currentPlyrInstance.on('playing', hideBuffering);
                currentPlyrInstance.on('canplay', hideBuffering);
                currentPlyrInstance.on('canplaythrough', hideBuffering);
                currentPlyrInstance.on('seeked', () => {
                    setTimeout(() => {
                        if (videoEl.readyState >= 3 && !videoEl.seeking) {
                            hideBuffering();
                        }
                    }, 200);
                });

                // Direct timeline range slider clicks & drags
                const seekRange = container.querySelector('[data-plyr="seek"]');
                if (seekRange) {
                    seekRange.addEventListener('pointerdown', showBuffering);
                    seekRange.addEventListener('mousedown', showBuffering);
                    seekRange.addEventListener('touchstart', showBuffering);
                    seekRange.addEventListener('input', showBuffering);
                    seekRange.addEventListener('change', showBuffering);
                }

                // Rewind / Fast-forward buttons
                const rewindBtn = container.querySelector('[data-plyr="rewind"]');
                if (rewindBtn) rewindBtn.addEventListener('click', showBuffering);
                const fastFwdBtn = container.querySelector('[data-plyr="fast-forward"]');
                if (fastFwdBtn) fastFwdBtn.addEventListener('click', showBuffering);

                container.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-plyr="fullscreen"]');
                    if (btn) {
                        if (!currentPlyrInstance.fullscreen || !currentPlyrInstance.fullscreen.active) {
                            lockLandscapeOrientation();
                        } else {
                            unlockScreenOrientation();
                        }
                    }
                }, true);
            }

            // Attempt autoplay smoothly
            try {
                const playPromise = currentPlyrInstance.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {
                        // Expected when browser blocks unmuted autoplay
                    });
                }
            } catch (e) {}
        });

        // Native video listeners for buffering
        videoEl.addEventListener('seeking', () => {
            const overlay = currentPlyrInstance?.elements?.container?.querySelector('.plyr-buffering-overlay');
            if (overlay) overlay.style.display = 'flex';
        });
        videoEl.addEventListener('waiting', () => {
            const overlay = currentPlyrInstance?.elements?.container?.querySelector('.plyr-buffering-overlay');
            if (overlay) overlay.style.display = 'flex';
        });
        videoEl.addEventListener('stalled', () => {
            const overlay = currentPlyrInstance?.elements?.container?.querySelector('.plyr-buffering-overlay');
            if (overlay) overlay.style.display = 'flex';
        });
        videoEl.addEventListener('playing', () => {
            const overlay = currentPlyrInstance?.elements?.container?.querySelector('.plyr-buffering-overlay');
            if (overlay) overlay.style.display = 'none';
        });
        videoEl.addEventListener('canplay', () => {
            const overlay = currentPlyrInstance?.elements?.container?.querySelector('.plyr-buffering-overlay');
            if (overlay) overlay.style.display = 'none';
        });

        // Lock landscape on Plyr fullscreen event
        currentPlyrInstance.on('enterfullscreen', () => {
            lockLandscapeOrientation();
        });

        // Restore orientation on exit fullscreen
        currentPlyrInstance.on('exitfullscreen', () => {
            unlockScreenOrientation();
        });

        // Native iOS & WebKit video fullscreen handlers
        videoEl.addEventListener('webkitbeginfullscreen', () => {
            lockLandscapeOrientation();
        });
        videoEl.addEventListener('webkitendfullscreen', () => {
            unlockScreenOrientation();
        });

        // Video completion triggers Auto Next
        currentPlyrInstance.on('ended', () => {
            handleVideoEnded();
        });
        videoEl.addEventListener('ended', () => {
            handleVideoEnded();
        });

        // Listen for errors to prompt user to switch stream server
        videoEl.addEventListener('error', () => {
            const errorBox = document.getElementById('playerStreamErrorNotice');
            if (errorBox) errorBox.style.display = 'flex';
        });

    } catch (err) {
        console.warn("Failed to initialize Plyr, using native controls:", err);
        videoEl.controls = true;
    }
}

// ==========================================
// 300x250 MEDIUM RECTANGLE AD UNITS
// ==========================================
let ad300x250Observer = null;

function getAd300x250Observer() {
    if (!ad300x250Observer && window.IntersectionObserver) {
        ad300x250Observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    renderAd300x250Iframe(target);
                    observer.unobserve(target);
                }
            });
        }, { rootMargin: "250px 0px" });
    }
    return ad300x250Observer;
}

function renderAd300x250Iframe(container) {
    if (window.__isVipSubscribed) {
        if (container) {
            container.innerHTML = '';
            const parent = container.closest('.ad-slot-300x250');
            if (parent) parent.remove();
        }
        return;
    }
    if (!container || container.dataset.loaded === 'true') return;
    container.dataset.loaded = 'true';

    const iframe = document.createElement('iframe');
    iframe.width = '300';
    iframe.height = '250';
    iframe.style.width = '300px';
    iframe.style.height = '250px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('marginwidth', '0');
    iframe.setAttribute('marginheight', '0');
    iframe.setAttribute('allowtransparency', 'true');

    const adHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: transparent;
            overflow: hidden;
            width: 300px;
            height: 250px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    </style>
</head>
<body>
    <script type="text/javascript">
        // Intercept links and window.open to open directly in Chrome app
        var origOpen = window.open;
        window.open = function(url) {
            try {
                if (window.parent && window.parent.openInChrome) {
                    window.parent.openInChrome(url);
                    return null;
                }
            } catch (e) {}
            return origOpen.apply(window, arguments);
        };
        document.addEventListener('click', function(e) {
            try {
                var target = e.target;
                if (!target || typeof target.closest !== 'function') return;
                var a = target.closest('a');
                if (a && a.href && a.href !== '#' && !a.href.startsWith('javascript:')) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        if (window.parent && window.parent.openInChrome) {
                            window.parent.openInChrome(a.href);
                            return;
                        }
                    } catch (err) {}
                    window.open(a.href, '_blank');
                }
            } catch (err) {}
        }, true);
    <\/script>
    <script type="text/javascript">
        atOptions = {
            'key' : '0b1e87c8ccc1319d59bdeee59249318d',
            'format' : 'iframe',
            'height' : 250,
            'width' : 300,
            'params' : {}
        };
    <\/script>
    <script type="text/javascript" src="https://www.highrevenueformat.com/0b1e87c8ccc1319d59bdeee59249318d/invoke.js"><\/script>
</body>
</html>`;

    container.appendChild(iframe);

    try {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(adHtml);
        iframe.contentWindow.document.close();
    } catch (e) {
        iframe.srcdoc = adHtml;
    }
}

function createAd300x250Element(lazy = true) {
    if (window.__isVipSubscribed) {
        const dummy = document.createElement('div');
        dummy.className = 'ad-slot-300x250 vip-suppressed';
        dummy.style.display = 'none';
        return dummy;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'ad-slot-300x250';
    wrapper.innerHTML = `
        <span class="ad-label">Advertisement</span>
        <div class="ad-slot-300x250-inner"></div>
    `;

    const inner = wrapper.querySelector('.ad-slot-300x250-inner');
    if (lazy && window.IntersectionObserver) {
        getAd300x250Observer().observe(inner);
    } else {
        renderAd300x250Iframe(inner);
    }

    return wrapper;
}

function rebindUnloadedAds() {
    if (window.__isVipSubscribed) return;
    if (!window.IntersectionObserver) return;
    const observer = getAd300x250Observer();
    const unloadedSlots = document.querySelectorAll('.ad-slot-300x250-inner:not([data-loaded="true"])');
    unloadedSlots.forEach(slot => {
        observer.observe(slot);
    });
}

// Open Dedicated Player Section
window.openPlayer = function(movie) {
    if (!movie) return;

    // Save previous scroll position
    savedScrollPosition = window.scrollY;
    currentPlayingMovie = movie;
    isPlayerView = true;
    updateHeaderButton();

    window.history.pushState({ view: 'player', title: movie.title }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderPlayerSection(movie, 0);
};

function renderPlayerSection(movie, activeServerIndex = 0) {
    const container = document.getElementById('mainContainer');
    if (!container) return;

    destroyCurrentPlyr();
    currentActiveServerIndex = activeServerIndex;

    const sourceInfo = detectMovieVideoSource(movie);
    const servers = getMovieServers(movie);
    const activeServer = servers[activeServerIndex] || servers[0];
    const isYouTube = (activeServer.type === 'yt') || (sourceInfo.type === 'yt');

    // Find related movies in same category
    const relatedMovies = allMovies
        .filter(m => m.category === movie.category && m.title !== movie.title)
        .slice(0, 16);

    const serverPills = servers.map((s, idx) => `
        <button class="server-pill ${idx === activeServerIndex ? 'active' : ''}" onclick="switchServer(${idx})">
            <i class="fa-solid ${s.type === 'yt' ? 'fa-play' : 'fa-server'}"></i> ${s.name}
        </button>
    `).join('');

    const titleText = movie.title || movie.name || 'Movie Player';
    const ratingText = movie.rating || '4.8';
    const categoryText = movie.category || 'General';

    // Player header badge & title
    let playerBadgeText = 'Plyr 1080p';
    let playerBadgeStyle = 'background: rgba(0, 210, 255, 0.15); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3);';
    let topBarIcon = '<i class="fa-solid fa-play" style="color: #00d2ff; font-size: 10px;"></i>';
    let topBarText = 'Plyr HD Player';

    if (isYouTube) {
        playerBadgeText = 'Cloud Stream HD';
        playerBadgeStyle = 'background: rgba(0, 210, 255, 0.15); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3);';
        topBarIcon = '<i class="fa-solid fa-play" style="color: #00d2ff; font-size: 11px;"></i>';
        topBarText = 'Cloud Stream Player';
    } else if (sourceInfo.type === 'video') {
        playerBadgeText = 'Worker CDN 1080p';
        playerBadgeStyle = 'background: rgba(0, 210, 255, 0.15); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3);';
        topBarIcon = '<i class="fa-solid fa-bolt" style="color: #00d2ff; font-size: 10px;"></i>';
        topBarText = 'Cloudflare Worker Stream Player';
    } else if (sourceInfo.type === 'drc') {
        playerBadgeText = 'Plyr Direct 1080p';
        playerBadgeStyle = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
        topBarIcon = '<i class="fa-solid fa-play" style="color: #10b981; font-size: 10px;"></i>';
        topBarText = 'Plyr Direct Player';
    }

    // Parse cast list for clickable actor buttons
    let castList = [];
    if (Array.isArray(movie.cast)) {
        castList = movie.cast.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof movie.cast === 'string' && movie.cast.trim().length > 0) {
        castList = movie.cast.split(/[,/|•]+/).map(c => c.trim()).filter(Boolean);
    }

    const castHtml = castList.length > 0 ? `
        <div class="player-cast-header">
            <span class="player-cast-title"><strong>Starring:</strong></span>
            <span class="player-cast-subtitle">Tap an actor to see all their movies</span>
        </div>
        <div class="player-cast-tags">
            ${castList.map(actor => `
                <button type="button" class="cast-pill-btn" onclick="filterByCast('${encodeURIComponent(actor).replace(/'/g, "%27")}')">
                    <i class="fa-solid fa-user"></i>
                    <span>${actor}</span>
                </button>
            `).join('')}
        </div>
    ` : `
        <div class="player-cast-header">
            <span class="player-cast-title"><strong>Starring:</strong></span>
        </div>
        <div style="font-size: 13px; color: #8b949e; margin-top: 4px;">All-Star Cast</div>
    `;

    container.innerHTML = `
        <div class="player-wrapper">
            <!-- Back Navigation Bar -->
            <div class="player-back-bar">
                <button class="back-nav-btn" onclick="exitPlayerView()">
                    <i class="fa-solid fa-arrow-left"></i> ${isInCloudStreamView ? 'Back to Watch Stream' : 'Back to Movies'}
                </button>
                <div style="font-size: 13px; color: #8b949e; display: flex; align-items: center; gap: 6px;">
                    ${topBarIcon}
                    <span>${topBarText}</span>
                </div>
            </div>

            <!-- Video Player Display: YouTube iframe OR Plyr Video Player -->
            <div class="player-video-box" id="activePlayerBox">
                ${isYouTube ? `
                    <iframe id="vdoSkyYouTube" class="player" src="${activeServer.url}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; margin: 0; padding: 0;"></iframe>
                    <!-- Protective Bottom Shield masking YouTube bottom options (copy link, suggestions, YT logo) -->
                    <div class="yt-bottom-shield" id="ytBottomShield">
                        <div class="yt-shield-brand">
                            <i class="fa-solid fa-bolt" style="color: #00d2ff; font-size: 11px;"></i>
                            <span>Cloud Stream HD</span>
                        </div>
                        <div class="yt-shield-controls">
                            <button type="button" class="auto-next-pill-btn ${isAutoNextEnabled ? 'active' : ''}" onclick="toggleAutoNext(); event.stopPropagation();" title="Toggle Auto Next">
                                <i class="fa-solid ${isAutoNextEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                <span>Auto Next: <strong>${isAutoNextEnabled ? 'ON' : 'OFF'}</strong></span>
                            </button>
                            <button type="button" class="quick-next-btn" onclick="playNextVideo(true); event.stopPropagation();" title="Play Next Stream">
                                <i class="fa-solid fa-forward-step"></i> Next
                            </button>
                        </div>
                    </div>
                ` : `
                    <video id="vdoSkyPlyr" class="player" playsinline controls preload="metadata" poster="${movie.poster || ''}">
                        <source src="${activeServer.url}" type="video/mp4">
                        Your browser does not support HTML5 video.
                    </video>

                    <!-- Stream Error Fallback Notice -->
                    <div id="playerStreamErrorNotice" style="display: none; position: absolute; inset: 0; background: rgba(10,12,18,0.93); z-index: 30; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; color: #ffb703; margin-bottom: 10px;"></i>
                        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 6px; color: #fff;">Stream Loading Interrupted</h3>
                        <p style="font-size: 12px; color: #8b949e; margin-bottom: 14px; max-width: 320px;">
                            This stream server is taking longer than expected. Please switch to another server to continue playing.
                        </p>
                        <button onclick="switchServer(${(activeServerIndex + 1) % servers.length})" style="background: #00d2ff; color: #1e1e2f; font-weight: bold; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-rotate"></i> Try Server ${((activeServerIndex + 1) % servers.length) + 1}
                        </button>
                    </div>
                `}
            </div>

            <!-- Streaming Server Switcher & Auto Next Controls -->
            <div class="server-selector">
                <span class="server-label"><i class="fa-solid fa-bolt"></i> Stream Server:</span>
                ${serverPills}
                <div class="auto-next-server-wrap">
                    <button type="button" class="auto-next-pill-btn ${isAutoNextEnabled ? 'active' : ''}" onclick="toggleAutoNext()" title="Toggle Auto Next">
                        <i class="fa-solid ${isAutoNextEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                        <span>Auto Next: <strong>${isAutoNextEnabled ? 'ON' : 'OFF'}</strong></span>
                    </button>
                    <button type="button" class="quick-next-btn" onclick="playNextVideo(true)" title="Play Next Stream">
                        <i class="fa-solid fa-forward-step"></i> Next
                    </button>
                </div>
            </div>

            <!-- Movie Details & Actions (Share & Fullscreen buttons removed from below player per request) -->
            <div class="player-info">
                <h1 class="player-movie-title">${titleText}</h1>
                
                <div class="player-badges">
                    <span class="player-badge badge-rating">★ ${ratingText}</span>
                    <span class="player-badge badge-category">${categoryText}</span>
                    <span class="player-badge" style="${playerBadgeStyle}">${playerBadgeText}</span>
                </div>

                <!-- Cast / Synopsis Box with Clickable Buttons -->
                <div class="player-cast-box">
                    ${castHtml}
                </div>
            </div>

            <!-- 300x250 Ad Unit Under Player (Non-VIP Only) -->
            ${!window.__isVipSubscribed ? `
            <div class="ad-slot-300x250" style="margin: 18px auto 12px auto;">
                <span class="ad-label">Advertisement</span>
                <div class="ad-slot-300x250-inner" id="playerUnderAdSlot"></div>
            </div>
            ` : ''}

            <!-- Related Movies Carousel -->
            ${relatedMovies.length > 0 ? `
                <div class="section-header" style="margin-top: 25px;">
                    <div class="section-title-wrapper">
                        <div class="section-bar"></div>
                        <div class="section-title">More in ${categoryText}</div>
                    </div>
                </div>
                <div class="horizontal-scroll-container" id="relatedCarousel"></div>
            ` : ''}
        </div>
    `;

    // Initialize YouTube player API instance or Plyr instance
    if (isYouTube) {
        setupYouTubePlayer('vdoSkyYouTube');
    } else {
        const videoEl = document.getElementById('vdoSkyPlyr');
        if (videoEl) {
            initPlyrPlayer(videoEl, movie, activeServerIndex);
        }
    }

    // Load ad under player (Non-VIP only)
    const playerUnderAdSlot = document.getElementById('playerUnderAdSlot');
    if (!window.__isVipSubscribed && playerUnderAdSlot) {
        renderAd300x250Iframe(playerUnderAdSlot);
    }

    // Populate related movies
    if (relatedMovies.length > 0) {
        const carousel = document.getElementById('relatedCarousel');
        if (carousel) {
            relatedMovies.forEach(m => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.onclick = () => window.openPlayer(m);

                const cardTitle = m.title || m.name || '';
                const isLong = cardTitle.length > 18;

                card.innerHTML = `
                    <span class="rating-badge">★ ${m.rating || '0.0'}</span>
                    <img src="${m.poster || ''}" loading="lazy">
                    <div class="movie-title-container">
                        <div class="movie-title ${isLong ? 'marquee-title' : ''}">${cardTitle}</div>
                    </div>
                `;
                carousel.appendChild(card);

                if (m.poster) {
                    getImage(m.poster).then(imgUrl => {
                        if (imgUrl) {
                            const img = card.querySelector('img');
                            if (img) img.src = imgUrl;
                        }
                    }).catch(() => {});
                }
            });
        }
    }
}

window.switchServer = function(serverIdx) {
    if (!currentPlayingMovie) return;
    currentActiveServerIndex = serverIdx;
    const servers = getMovieServers(currentPlayingMovie);
    const targetServer = servers[serverIdx] || servers[0];

    // Hide error banner if showing
    const errorBox = document.getElementById('playerStreamErrorNotice');
    if (errorBox) errorBox.style.display = 'none';

    // Update active pill styling
    document.querySelectorAll('.server-pill').forEach((pill, idx) => {
        pill.classList.toggle('active', idx === serverIdx);
    });

    const isTargetYouTube = targetServer.type === 'yt' || (targetServer.url && targetServer.url.includes('youtube'));

    if (currentPlyrInstance && !isTargetYouTube) {
        currentPlyrInstance.source = {
            type: 'video',
            title: currentPlayingMovie.title || 'Movie',
            sources: [
                {
                    src: targetServer.url,
                    type: 'video/mp4'
                }
            ],
            poster: currentPlayingMovie.poster || ''
        };
        currentPlyrInstance.play().catch(() => {});
        showToast(`Connected to ${targetServer.name}`);
    } else {
        renderPlayerSection(currentPlayingMovie, serverIdx);
        showToast(`Connected to ${targetServer.name}`);
    }
};

window.triggerFullscreenPlayer = function() {
    if (currentPlyrInstance && currentPlyrInstance.fullscreen) {
        if (!currentPlyrInstance.fullscreen.active) {
            currentPlyrInstance.fullscreen.enter();
            lockLandscapeOrientation();
        } else {
            currentPlyrInstance.fullscreen.exit();
            unlockScreenOrientation();
        }
    } else {
        const box = document.getElementById('activePlayerBox');
        if (!box) return;
        if (box.requestFullscreen) {
            box.requestFullscreen({ navigationUI: 'hide' }).then(() => {
                lockLandscapeOrientation();
            }).catch(() => {});
        } else if (box.webkitRequestFullscreen) {
            box.webkitRequestFullscreen();
            lockLandscapeOrientation();
        }
    }
};

window.shareCurrentMovie = function() {
    if (!currentPlayingMovie) return;
    const title = currentPlayingMovie.title || 'VDOSky Movie';
    const text = `Watch "${title}" on VDOSky: ${window.location.href}`;

    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: window.location.href
        }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Movie link copied to clipboard!");
        }).catch(() => {
            showToast("Shared: " + title);
        });
    } else {
        showToast("Shared: " + title);
    }
};

window.exitPlayerView = function() {
    destroyCurrentPlyr();
    isPlayerView = false;
    currentPlayingMovie = null;
    updateHeaderButton();

    if (isInCloudStreamView) {
        window.openCloudStreamSection();
    } else if (isInCategoryView && currentCategoryName !== 'all') {
        window.filterAndDisplay(currentCategoryName, true);
    } else {
        const container = document.getElementById('mainContainer');
        if (!window.__isVipSubscribed && homeCachedHTML && container) {
            container.innerHTML = homeCachedHTML;
            rebindHomeCardClicks();
        } else {
            homeCachedHTML = "";
            renderContent(allMovies);
        }
    }

    // Restore smooth scroll position
    setTimeout(() => {
        window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
    }, 50);
};

function rebindHomeCardClicks() {
    const container = document.getElementById('mainContainer');
    if (!container) return;

    const cards = container.querySelectorAll('.movie-card');
    cards.forEach(card => {
        const movieIndex = card.dataset.movieIndex;
        if (movieIndex !== undefined && allMovies[movieIndex]) {
            card.onclick = () => window.openPlayer(allMovies[movieIndex]);
        }
    });

    rebindUnloadedAds();
}

// Render Home Screen Content
async function renderContent(movies) {
    isPlayerView = false;
    isInCategoryView = false;
    currentCategoryName = "all";
    updateHeaderButton(); 
    
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = "";

    const container = document.getElementById('mainContainer');
    if (!container) return;
    container.innerHTML = "";

    // 1. Featured / Recently Added Section (Shows the latest added movies at the very top)
    const recentMovies = movies.slice(0, 15);
    if (recentMovies.length > 0) {
        const recentDiv = document.createElement('div');
        recentDiv.style.marginBottom = "-25px";
        recentDiv.innerHTML = `
            <div class="section-header">
                <div class="section-title-wrapper">
                    <div class="section-bar" style="background: linear-gradient(180deg, #ff3b30, #ff9500);"></div>
                    <div class="section-title" style="color: #fff;"><i class="fa-solid fa-fire" style="color: #ff3b30; margin-right: 6px;"></i> Recently Added</div>
                </div>
            </div>
            <div class="horizontal-scroll-container"></div>
        `;

        container.appendChild(recentDiv);
        const recentRow = recentDiv.querySelector('.horizontal-scroll-container');

        for (let i = 0; i < recentMovies.length; i++) {
            const m = recentMovies[i];
            const card = document.createElement('div');
            card.className = 'movie-card';
            const globalIndex = allMovies.indexOf(m);
            card.dataset.movieIndex = globalIndex >= 0 ? globalIndex : i;
            card.onclick = () => window.openPlayer(m);

            const titleText = m.title || m.name || '';
            const isLong = titleText.length > 18;
            const isLatest = i === 0;

            card.innerHTML = `
                <span class="rating-badge">${isLatest ? '<span style="color: #00ff88; font-weight: 700; margin-right: 4px;">NEW</span>' : ''}★ ${m.rating || '0.0'}</span>
                <img src="${m.poster || m.image || ''}" loading="lazy" decoding="async">
                <div class="movie-title-container">
                    <div class="movie-title ${isLong ? 'marquee-title' : ''}">${titleText}</div>
                </div>
            `;
            recentRow.appendChild(card);

            if (m.poster) {
                getImage(m.poster).then(imgUrl => {
                    if (imgUrl) {
                        const img = card.querySelector('img');
                        if (img) img.src = imgUrl;
                    }
                }).catch(() => {});
            }
        }
    }

    const categories = [...new Set(movies.map(m => m.category).filter(Boolean))];

    let renderedCatCount = 0;
    for (const cat of categories) {
        const catMovies = movies.filter(m => m.category === cat);
        if (catMovies.length === 0) continue;
        renderedCatCount++;

        // Display up to 8 movies per category on the home page
        const displayMovies = catMovies.slice(0, 8);

        const sectionDiv = document.createElement('div');
        sectionDiv.style.marginBottom = "-25px";
        sectionDiv.innerHTML = `
            <div class="section-header">
                <div class="section-title-wrapper">
                    <div class="section-bar"></div>
                    <div class="section-title">${cat} (${catMovies.length})</div>
                </div>
                <button class="show-all-btn" onclick="showAllCategory('${cat.replace(/'/g, "\\'")}')">Show All</button>
            </div>
            <div class="horizontal-scroll-container"></div>
        `;

        container.appendChild(sectionDiv);
        const rowContainer = sectionDiv.querySelector('.horizontal-scroll-container');
        
        for (const m of displayMovies) {
            const card = document.createElement('div');
            card.className = 'movie-card';
            const globalIndex = allMovies.indexOf(m);
            card.dataset.movieIndex = globalIndex;
            card.onclick = () => window.openPlayer(m); 

            const titleText = m.title || m.name || '';
            const isLong = titleText.length > 18;

            card.innerHTML = `
                <span class="rating-badge">★ ${m.rating || '0.0'}</span>
                <img src="${m.poster || m.image || ''}" loading="lazy" decoding="async">
                <div class="movie-title-container">
                    <div class="movie-title ${isLong ? 'marquee-title' : ''}">${titleText}</div>
                </div>
            `;
            rowContainer.appendChild(card);

            if (m.poster) {
                getImage(m.poster).then(imgUrl => {
                    if (imgUrl) {
                        const img = card.querySelector('img');
                        if (img) img.src = imgUrl;
                    }
                }).catch(() => {});
            }
        }

        // Show 300x250 ad unit after every 3 categories (Non-VIP only)
        if (!window.__isVipSubscribed && renderedCatCount % 3 === 0) {
            const adSlot = createAd300x250Element(true);
            container.appendChild(adSlot);
        }
    }

    homeCachedHTML = container.innerHTML;
}

window.showAllCategory = async function(categoryName) {
    currentCategoryName = categoryName;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = categoryName;
    isInCategoryView = true;
    isPlayerView = false;
    updateHeaderButton(); 
    await filterAndDisplay(categoryName, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.handleMenuOrBack = function() {
    if (isPlayerView) {
        exitPlayerView();
    } else if (isInSubscriptionView) {
        isInSubscriptionView = false;
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('searchClearBtn');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Enter Movie Name or Cast...';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        updateHeaderButton();
        homeCachedHTML = "";
        updateVipAdSuppression();
        renderContent(allMovies);
    } else if (isInCloudStreamView) {
        isInCloudStreamView = false;
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('searchClearBtn');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Enter Movie Name or Cast...';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        updateHeaderButton();
        renderContent(allMovies);
    } else if (isInCategoryView) {
        isInCategoryView = false;
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('searchClearBtn');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Enter Movie Name or Cast...';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        updateHeaderButton();
        renderContent(allMovies);
    } else {
        window.toggleDropdown();
    }
};

window.goHome = function() {
    isInSubscriptionView = false;
    isInCloudStreamView = false;
    isInCategoryView = false;
    isPlayerView = false;
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'Enter Movie Name or Cast...';
    }
    if (clearBtn) clearBtn.style.display = 'none';
    updateHeaderButton();
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown && dropdown.classList.contains("active")) {
        dropdown.classList.remove("active");
    }
    renderContent(allMovies);
};

window.clearTopSearch = function() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';

    if (isInSubscriptionView) {
        isInSubscriptionView = false;
        updateHeaderButton();
        renderContent(allMovies);
    } else if (isInCloudStreamView) {
        renderCloudCategoryFilter(currentCloudCategory);
    } else {
        isInCategoryView = false;
        updateHeaderButton();
        renderContent(allMovies);
    }
};

function updateHeaderButton() {
    const menuToggle = document.getElementById('menuToggle');
    const menuIcon = document.getElementById('menuIcon');
    const menuBtnText = document.getElementById('menuBtnText');

    if (!menuToggle || !menuIcon || !menuBtnText) return;

    if (isPlayerView || isInCategoryView || isInCloudStreamView || isInSubscriptionView) {
        menuIcon.className = "fa-solid fa-arrow-left";
        menuBtnText.innerText = "Back";
        menuToggle.style.background = "#ff4757";
        menuToggle.style.color = "#fff";
    } else {
        menuIcon.className = "fa-solid fa-bars";
        menuBtnText.innerText = "Menu";
        menuToggle.style.background = "#00d2ff";
        menuToggle.style.color = "#1e1e2f";
    }
}

window.toggleDropdown = function() { 
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown) dropdown.classList.toggle("active");
};

window.handleMenuShareApp = function(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown && dropdown.classList.contains("active")) {
        dropdown.classList.remove("active");
    }
    
    const shareUrl = "https://vdoskay.blogspot.com";
    const shareTitle = "VDOSky App - Free Movies, Music & QR Scanner";
    const shareText = "Download VDOSky App to watch free HD Movies, listen to trending Music & scan QR codes:";

    // 1. Try Android Native Interface
    if (window.Android && typeof window.Android.shareApp === 'function') {
        window.Android.shareApp(shareText, shareUrl);
        return;
    }

    // 2. Try Web Share API (Triggers native OS share dialog directly)
    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch((err) => {
            if (err && err.name !== 'AbortError') {
                window.location.href = "share.html";
            }
        });
        return;
    }

    // 3. Fallback: Open dedicated share.html section
    window.location.href = "share.html";
};

window.handleSearchInput = async function() {
    const searchInput = document.getElementById('searchInput');
    const term = searchInput ? searchInput.value.trim() : '';
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = term.length > 0 ? 'block' : 'none';

    // If currently in the YouTube / Watch Stream section, ONLY perform YouTube search!
    if (isInCloudStreamView) {
        performCloudStreamSearch(term);
        return;
    }

    if (term === "") {
        isInCategoryView = false;
        isPlayerView = false;
        updateHeaderButton();
        await renderContent(allMovies);
    } else {
        isInCategoryView = true;
        isPlayerView = false;
        updateHeaderButton();
        await filterAndDisplay(term);
    }
};

window.filterAndDisplay = async function(term, isExactCategory = false) {
    const container = document.getElementById('mainContainer');
    if (!container) return;
    const lowerTerm = term.toLowerCase();

    const filtered = allMovies.filter(m => {
        if (isExactCategory) {
            return m.category && m.category.toLowerCase() === lowerTerm;
        }
        return (m.title && m.title.toLowerCase().includes(lowerTerm)) || 
            (m.name && m.name.toLowerCase().includes(lowerTerm)) ||
            (m.category && m.category.toLowerCase().includes(lowerTerm)) ||
            (m.cast && (typeof m.cast === 'string' ? m.cast.toLowerCase().includes(lowerTerm) : Array.isArray(m.cast) && m.cast.join(' ').toLowerCase().includes(lowerTerm)));
    });

    const displayTitle = isExactCategory ? `${term} (${filtered.length})` : `Results for "${term}" (${filtered.length})`;

    container.innerHTML = `
        <div class="section-header">
            <div class="section-title-wrapper">
                <div class="section-bar"></div>
                <div class="section-title">${displayTitle}</div>
            </div>
        </div>
        <div class="gallery-grid" id="searchResultGrid"></div>
    `;

    const grid = document.getElementById('searchResultGrid');
    if (!grid) return;

    let postCount = 0;
    for (const m of filtered) {
        postCount++;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.flex = "none";
        card.style.minWidth = "unset";
        card.onclick = () => window.openPlayer(m); 

        const titleText = m.title || m.name || '';
        const isLong = titleText.length > 18;

        card.innerHTML = `
            <span class="rating-badge">★ ${m.rating || '0.0'}</span>
            <img src="${m.poster || m.image || ''}" loading="lazy" decoding="async">
            <div class="movie-title-container">
                <div class="movie-title ${isLong ? 'marquee-title' : ''}">${titleText}</div>
            </div>
        `;
        grid.appendChild(card);

        // Show 300x250 ad after every 36 posts; lazy loads when user scrolls near it (Non-VIP only)
        if (!window.__isVipSubscribed && postCount % 36 === 0) {
            const adSlot = createAd300x250Element(true);
            adSlot.classList.add('ad-slot-grid-span');
            grid.appendChild(adSlot);
        }

        if (m.poster) {
            getImage(m.poster).then(imgUrl => {
                if (imgUrl) {
                    const img = card.querySelector('img');
                    if (img) img.src = imgUrl;
                }
            }).catch(() => {});
        }
    }
};

// Filter and display all movies for a clicked cast member
window.filterByCast = async function(encodedActor) {
    if (!encodedActor) return;
    let actorName = "";
    try {
        actorName = decodeURIComponent(encodedActor).trim();
    } catch (e) {
        actorName = String(encodedActor).trim();
    }
    if (!actorName) return;

    // Exit active player and navigate to category/search view
    destroyCurrentPlyr();
    isPlayerView = false;
    isInCategoryView = true;
    currentCategoryName = actorName;
    updateHeaderButton();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = actorName;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    await window.displayMoviesByCast(actorName);
};

window.displayMoviesByCast = async function(actorName) {
    const container = document.getElementById('mainContainer');
    if (!container) return;
    const lowerActor = actorName.toLowerCase();

    // Filter all movies where this actor is in the cast
    let filtered = allMovies.filter(m => {
        if (!m) return false;
        if (m.cast) {
            if (typeof m.cast === 'string' && m.cast.toLowerCase().includes(lowerActor)) return true;
            if (Array.isArray(m.cast) && m.cast.some(c => c && String(c).toLowerCase().includes(lowerActor))) return true;
        }
        return false;
    });

    // Fallback search across all fields if no direct cast match found
    if (filtered.length === 0) {
        filtered = allMovies.filter(m => 
            (m.title && m.title.toLowerCase().includes(lowerActor)) || 
            (m.name && m.name.toLowerCase().includes(lowerActor)) ||
            (m.cast && (typeof m.cast === 'string' ? m.cast.toLowerCase().includes(lowerActor) : Array.isArray(m.cast) && m.cast.join(' ').toLowerCase().includes(lowerActor)))
        );
    }

    container.innerHTML = `
        <div class="section-header">
            <div class="section-title-wrapper">
                <div class="section-bar"></div>
                <div class="section-title">
                    <i class="fa-solid fa-user-tag" style="color: #00d2ff; margin-right: 6px; font-size: 14px;"></i>
                    Movies Starring "${actorName}" (${filtered.length})
                </div>
            </div>
        </div>
        <div class="gallery-grid" id="searchResultGrid"></div>
    `;

    const grid = document.getElementById('searchResultGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: #8b949e;">
                <i class="fa-solid fa-film" style="font-size: 40px; margin-bottom: 14px; opacity: 0.4; color: #00d2ff;"></i>
                <p style="font-size: 15px; color: #fff; margin-bottom: 6px;">No movies found for "${actorName}"</p>
                <p style="font-size: 12px;">Try exploring other categories or search for another movie.</p>
            </div>
        `;
        return;
    }

    let postCount = 0;
    for (const m of filtered) {
        postCount++;
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.flex = "none";
        card.style.minWidth = "unset";
        card.onclick = () => window.openPlayer(m); 

        const titleText = m.title || m.name || '';
        const isLong = titleText.length > 18;

        card.innerHTML = `
            <span class="rating-badge">★ ${m.rating || '0.0'}</span>
            <img src="${m.poster || m.image || ''}" loading="lazy" decoding="async">
            <div class="movie-title-container">
                <div class="movie-title ${isLong ? 'marquee-title' : ''}">${titleText}</div>
            </div>
        `;
        grid.appendChild(card);

        // Show 300x250 ad after every 36 posts (Non-VIP only)
        if (!window.__isVipSubscribed && postCount % 36 === 0) {
            const adSlot = createAd300x250Element(true);
            adSlot.classList.add('ad-slot-grid-span');
            grid.appendChild(adSlot);
        }

        if (m.poster) {
            getImage(m.poster).then(imgUrl => {
                if (imgUrl) {
                    const img = card.querySelector('img');
                    if (img) img.src = imgUrl;
                }
            }).catch(() => {});
        }
    }
};

window.startVoiceSearch = async function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast("Voice search not supported in this browser");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    const micBtn = document.getElementById('micBtn');

    recognition.onstart = function() {
        if (micBtn) micBtn.classList.add('listening');
    };

    recognition.onresult = async function(event) {
        const speechToText = event.results[0][0].transcript;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = speechToText;
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) clearBtn.style.display = 'block';

        if (isInCloudStreamView) {
            performCloudStreamSearch(speechToText);
        } else {
            isInCloudStreamView = false;
            isInCategoryView = true;
            isPlayerView = false;
            updateHeaderButton();
            await window.filterAndDisplay(speechToText);
        }
    };

    recognition.onerror = function() {
        if (micBtn) micBtn.classList.remove('listening');
    };

    recognition.onend = function() {
        if (micBtn) micBtn.classList.remove('listening');
    };

    recognition.start();
};

// Handle Browser / Android Hardware Back Button
window.addEventListener('popstate', () => {
    if (isPlayerView) {
        window.exitPlayerView();
    } else if (isInCloudStreamView) {
        isInCloudStreamView = false;
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('searchClearBtn');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Enter Movie Name or Cast...';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        updateHeaderButton();
        renderContent(allMovies);
    } else if (isInCategoryView) {
        isInCategoryView = false;
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('searchClearBtn');
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = 'Enter Movie Name or Cast...';
        }
        if (clearBtn) clearBtn.style.display = 'none';
        updateHeaderButton();
        renderContent(allMovies);
    }
});

// ==========================================
// FIXED FOOTER BANNER AD (320x50 with 45-55s Auto-refresh)
// ==========================================

function loadFooterBannerAd() {
    const container = document.getElementById('fixedFooterAdInner');
    if (!container) return;
    const outer = document.getElementById('fixedFooterAdContainer');

    if (window.__isVipSubscribed) {
        if (outer) outer.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    if (outer) outer.style.display = 'flex';

    // Clear previous ad iframe to guarantee fresh impression and script load
    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.id = 'vdoSkyFooterAdFrame_' + Date.now();
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.width = '320px';
    iframe.style.height = '50px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('marginwidth', '0');
    iframe.setAttribute('marginheight', '0');
    iframe.setAttribute('allowtransparency', 'true');

    // HighRevenueFormat Ad Unit HTML
    const adDocContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: transparent;
            overflow: hidden;
            width: 320px;
            height: 50px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    </style>
</head>
<body>
    <script type="text/javascript">
        // Intercept links and window.open to open directly in Chrome app
        var origOpen = window.open;
        window.open = function(url) {
            try {
                if (window.parent && window.parent.openInChrome) {
                    window.parent.openInChrome(url);
                    return null;
                }
            } catch (e) {}
            return origOpen.apply(window, arguments);
        };
        document.addEventListener('click', function(e) {
            try {
                var target = e.target;
                if (!target || typeof target.closest !== 'function') return;
                var a = target.closest('a');
                if (a && a.href && a.href !== '#' && !a.href.startsWith('javascript:')) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        if (window.parent && window.parent.openInChrome) {
                            window.parent.openInChrome(a.href);
                            return;
                        }
                    } catch (err) {}
                    window.open(a.href, '_blank');
                }
            } catch (err) {}
        }, true);
    <\/script>
    <script type="text/javascript">
        atOptions = {
            'key' : 'fec896668e376077dc0281401ab2b9ad',
            'format' : 'iframe',
            'height' : 50,
            'width' : 320,
            'params' : {}
        };
    <\/script>
    <script type="text/javascript" src="https://www.highrevenueformat.com/fec896668e376077dc0281401ab2b9ad/invoke.js"><\/script>
</body>
</html>`;

    container.appendChild(iframe);

    try {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(adDocContent);
        iframe.contentWindow.document.close();
    } catch (err) {
        iframe.srcdoc = adDocContent;
    }
}

function scheduleFooterAdRefresh() {
    if (adRefreshTimer) {
        clearTimeout(adRefreshTimer);
        adRefreshTimer = null;
    }
    if (window.__isVipSubscribed) return;
    // Random interval between 45 and 55 seconds
    const minSec = 45;
    const maxSec = 55;
    const randomSeconds = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;

    adRefreshTimer = setTimeout(() => {
        loadFooterBannerAd();
        scheduleFooterAdRefresh();
    }, randomSeconds * 1000);
}

function initFooterBannerAd() {
    if (window.__isVipSubscribed) return;
    loadFooterBannerAd();
    scheduleFooterAdRefresh();
}

// ==========================================
// SMARTLINK INTERSTITIAL AD (15-min interval, 15s skip countdown, fullscreen support)
// ==========================================
const SMARTLINK_URL = "https://www.profitableratecpmnetwork.com/yjtnajfd?key=cc49d62c781de224c118e83dc6c2ea8f";
const INTERSTITIAL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let interstitialCountdownInterval = null;
let wasPlayingBeforeInterstitial = false;
let lastInterstitialTime = parseInt(localStorage.getItem('vdosky_last_interstitial') || '0', 10);

if (!lastInterstitialTime) {
    lastInterstitialTime = Date.now();
    localStorage.setItem('vdosky_last_interstitial', lastInterstitialTime.toString());
}

let wasFullscreenBeforeInterstitial = false;
let wasForcedLandscape = false;

function showSmartlinkInterstitial() {
    if (window.__isVipSubscribed) return;
    if (isSmartlinkInterstitialActive) return;
    isSmartlinkInterstitialActive = true;
    lastInterstitialTime = Date.now();
    localStorage.setItem('vdosky_last_interstitial', lastInterstitialTime.toString());

    // 1. Check if ANY fullscreen mode is active (browser native fullscreen or Plyr fullscreen)
    const fsEl = document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement;

    wasFullscreenBeforeInterstitial = !!(
        fsEl ||
        (currentPlyrInstance && currentPlyrInstance.fullscreen && currentPlyrInstance.fullscreen.active)
    );

    // If browser is in native fullscreen on any element (especially YouTube iframe),
    // exit native fullscreen so the ad modal on document.body is 100% visible on top of everything!
    if (fsEl) {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        } catch (e) {}
    }

    // If active player box is forced into landscape orientation, temporarily unforce it so modal is upright
    const activeBox = document.getElementById('activePlayerBox');
    if (activeBox && activeBox.classList.contains('plyr-force-landscape')) {
        wasForcedLandscape = true;
        activeBox.classList.remove('plyr-force-landscape');
    }

    // 2. Pause video playback (both HTML5/Plyr and YouTube iframe stream)
    if (currentPlyrInstance && !currentPlyrInstance.paused) {
        wasPlayingBeforeInterstitial = true;
        try { currentPlyrInstance.pause(); } catch (e) {}
    }

    const ytIframe = document.getElementById('vdoSkyYouTube');
    if (ytIframe && ytIframe.contentWindow) {
        wasPlayingBeforeInterstitial = true;
        try {
            ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } catch (e) {}
    }

    // 3. Ensure modal element exists and is located directly under document.body
    let modal = document.getElementById('smartlinkInterstitialModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smartlinkInterstitialModal';
        modal.className = 'interstitial-modal';
        modal.innerHTML = `
            <div class="interstitial-header">
                <div class="interstitial-header-right">
                    <button class="interstitial-chrome-btn" onclick="openSmartlinkInChrome()">
                        <i class="fa-brands fa-chrome"></i> Open in Chrome
                    </button>
                    <button id="interstitialSkipBtn" class="interstitial-skip-btn disabled" disabled onclick="closeSmartlinkInterstitial()">
                        <i class="fa-solid fa-lock"></i> 15s
                    </button>
                </div>
            </div>
            <div class="interstitial-body">
                <div class="interstitial-fallback-card" onclick="openSmartlinkInChrome()">
                    <div class="interstitial-fallback-icon"><i class="fa-solid fa-rectangle-ad"></i></div>
                    <div class="interstitial-fallback-title">Special Sponsored Offer</div>
                    <div class="interstitial-fallback-desc">Explore premium deals and content in Google Chrome</div>
                    <button class="interstitial-fallback-btn"><i class="fa-brands fa-chrome"></i> Open Sponsor Offer</button>
                </div>
                <iframe id="smartlinkAdIframe" src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation" scrolling="yes"></iframe>
            </div>
            <div class="interstitial-bottom-bar" onclick="openSmartlinkInChrome()">
                <span><i class="fa-brands fa-chrome"></i> Tap here to open in Chrome app</span>
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </div>
        `;
        document.body.appendChild(modal);
    } else if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';

    // Set Smartlink iframe src
    const iframe = document.getElementById('smartlinkAdIframe');
    if (iframe) {
        iframe.src = SMARTLINK_URL;
    }

    // 15 seconds countdown
    let remainingSeconds = 15;
    const countdownEl = document.getElementById('interstitialCountdown');
    const timerNoticeEl = document.getElementById('interstitialTimerNotice');
    const skipBtn = document.getElementById('interstitialSkipBtn');

    if (countdownEl) countdownEl.innerText = remainingSeconds;
    if (timerNoticeEl) timerNoticeEl.innerHTML = `<i class="fa-solid fa-clock"></i> Skip in <strong id="interstitialCountdown">${remainingSeconds}</strong>s`;
    if (skipBtn) {
        skipBtn.className = 'interstitial-skip-btn disabled';
        skipBtn.disabled = true;
        skipBtn.innerHTML = `<i class="fa-solid fa-lock"></i> ${remainingSeconds}s`;
    }

    if (interstitialCountdownInterval) clearInterval(interstitialCountdownInterval);

    interstitialCountdownInterval = setInterval(() => {
        remainingSeconds--;
        const cEl = document.getElementById('interstitialCountdown');
        if (cEl) cEl.innerText = remainingSeconds;
        const currentSkipBtn = document.getElementById('interstitialSkipBtn');
        if (currentSkipBtn && remainingSeconds > 0) {
            currentSkipBtn.innerHTML = `<i class="fa-solid fa-lock"></i> ${remainingSeconds}s`;
        }

        if (remainingSeconds <= 0) {
            clearInterval(interstitialCountdownInterval);
            const notice = document.getElementById('interstitialTimerNotice');
            if (notice) {
                notice.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #00d2ff;"></i> Ad ready to skip`;
            }
            if (currentSkipBtn) {
                currentSkipBtn.className = 'interstitial-skip-btn ready';
                currentSkipBtn.disabled = false;
                currentSkipBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Skip Ad`;
            }
        }
    }, 1000);
}
window.showSmartlinkInterstitial = showSmartlinkInterstitial;

function closeSmartlinkInterstitial() {
    const modal = document.getElementById('smartlinkInterstitialModal');
    if (modal) {
        modal.style.display = 'none';
        if (modal.parentElement && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
    }
    const iframe = document.getElementById('smartlinkAdIframe');
    if (iframe) {
        iframe.src = 'about:blank';
    }
    if (interstitialCountdownInterval) {
        clearInterval(interstitialCountdownInterval);
    }
    isSmartlinkInterstitialActive = false;

    // If video was playing before ad interrupted, resume playing smoothly
    if (wasPlayingBeforeInterstitial) {
        wasPlayingBeforeInterstitial = false;
        if (currentPlyrInstance) {
            try { currentPlyrInstance.play().catch(() => {}); } catch (e) {}
        }
        const ytIframe = document.getElementById('vdoSkyYouTube');
        if (ytIframe && ytIframe.contentWindow) {
            try {
                ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
            } catch (e) {}
        }
    }

    // Restore forced landscape if it was active
    if (wasForcedLandscape) {
        wasForcedLandscape = false;
        const activeBox = document.getElementById('activePlayerBox');
        if (activeBox) activeBox.classList.add('plyr-force-landscape');
    }

    // If user was watching video in fullscreen, restore fullscreen & orientation
    if (wasFullscreenBeforeInterstitial) {
        wasFullscreenBeforeInterstitial = false;
        setTimeout(() => {
            if (currentPlyrInstance && currentPlyrInstance.fullscreen) {
                try { currentPlyrInstance.fullscreen.enter(); } catch (e) {}
            } else {
                const box = document.getElementById('activePlayerBox');
                if (box) {
                    if (box.requestFullscreen) {
                        box.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                    } else if (box.webkitRequestFullscreen) {
                        box.webkitRequestFullscreen();
                    }
                }
            }
            lockLandscapeOrientation();
        }, 120);
    }
}
window.closeSmartlinkInterstitial = closeSmartlinkInterstitial;

function openSmartlinkInChrome() {
    window.openInChrome(SMARTLINK_URL);
}
window.openSmartlinkInChrome = openSmartlinkInChrome;

// ==========================================
// POPUNDER INTERSTITIAL AD SYSTEM (Strict 5-Minute Cooldown, 15s Skip, Scrollable Modal, Opens in Chrome)
// Script tag: https://pl29511424.profitableratecpmnetwork.com/b8/df/16/b8df16d3dfe6b019e40e7ed7888c473d.js
// ==========================================
const POPUNDER_SCRIPT_URL = "https://pl29511424.profitableratecpmnetwork.com/b8/df/16/b8df16d3dfe6b019e40e7ed7888c473d.js";
const POPUNDER_TARGET_URL = SMARTLINK_URL;
const POPUNDER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

let popunderCountdownInterval = null;
let lastPopunderTime = parseInt(localStorage.getItem('vdosky_last_popunder') || '0', 10);

// If first time or invalid, start 5-minute timer from current moment so it does not trigger instantly on first click
if (!lastPopunderTime) {
    lastPopunderTime = Date.now();
    localStorage.setItem('vdosky_last_popunder', lastPopunderTime.toString());
}

let wasPlayingBeforePopunder = false;
let wasFullscreenBeforePopunder = false;
let wasForcedLandscapePopunder = false;

// Inject the official Popunder script
function injectPopunderScript() {
    try {
        const existing = document.querySelector(`script[src="${POPUNDER_SCRIPT_URL}"]`);
        if (!existing) {
            const sc = document.createElement('script');
            sc.src = POPUNDER_SCRIPT_URL;
            sc.async = true;
            sc.type = 'text/javascript';
            document.head.appendChild(sc);
        }
    } catch (e) {
        console.warn("Popunder script injection notice:", e);
    }
}
injectPopunderScript();

function openPopunderInChrome() {
    window.openInChrome(POPUNDER_TARGET_URL);
}
window.openPopunderInChrome = openPopunderInChrome;

function showPopunderInterstitial() {
    if (window.__isVipSubscribed) return;
    if (isPopunderActive || isSmartlinkInterstitialActive) return;
    
    // Check cooldown again strictly
    const now = Date.now();
    if (now - lastPopunderTime < POPUNDER_COOLDOWN_MS) return;

    isPopunderActive = true;
    lastPopunderTime = now;
    localStorage.setItem('vdosky_last_popunder', lastPopunderTime.toString());

    // 1. Check & exit any browser fullscreen so modal is 100% visible on top
    const fsEl = document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement;

    wasFullscreenBeforePopunder = !!(
        fsEl ||
        (currentPlyrInstance && currentPlyrInstance.fullscreen && currentPlyrInstance.fullscreen.active)
    );

    if (fsEl) {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        } catch (e) {}
    }

    const activeBox = document.getElementById('activePlayerBox');
    if (activeBox && activeBox.classList.contains('plyr-force-landscape')) {
        wasForcedLandscapePopunder = true;
        activeBox.classList.remove('plyr-force-landscape');
    }

    // 2. Pause video playback
    if (currentPlyrInstance && !currentPlyrInstance.paused) {
        wasPlayingBeforePopunder = true;
        try { currentPlyrInstance.pause(); } catch (e) {}
    }

    const ytIframe = document.getElementById('vdoSkyYouTube');
    if (ytIframe && ytIframe.contentWindow) {
        wasPlayingBeforePopunder = true;
        try {
            ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } catch (e) {}
    }

    // 3. Ensure modal element exists and matches interstitial layout exactly
    let modal = document.getElementById('popunderInterstitialModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'popunderInterstitialModal';
        modal.className = 'interstitial-modal';
        modal.innerHTML = `
            <div class="interstitial-header">
                <div class="interstitial-header-right">
                    <button class="interstitial-chrome-btn" onclick="openPopunderInChrome()">
                        <i class="fa-brands fa-chrome"></i> Open in Chrome
                    </button>
                    <button id="popunderSkipBtn" class="interstitial-skip-btn disabled" disabled onclick="closePopunderInterstitial()">
                        <i class="fa-solid fa-lock"></i> 15s
                    </button>
                </div>
            </div>
            <div class="interstitial-body" id="popunderAdBody">
                <div class="interstitial-fallback-card" onclick="openPopunderInChrome()">
                    <div class="interstitial-fallback-icon"><i class="fa-solid fa-rectangle-ad"></i></div>
                    <div class="interstitial-fallback-title">Special Sponsored Offer</div>
                    <div class="interstitial-fallback-desc">Explore premium deals and content in Google Chrome</div>
                    <button class="interstitial-fallback-btn"><i class="fa-brands fa-chrome"></i> Open Sponsor Offer</button>
                </div>
                <iframe id="popunderAdIframe" src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation" scrolling="yes"></iframe>
            </div>
            <div class="interstitial-bottom-bar" onclick="openPopunderInChrome()">
                <span><i class="fa-brands fa-chrome"></i> Tap here to open in Chrome app</span>
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </div>
        `;
        document.body.appendChild(modal);
    } else if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';

    // Load iframe
    const iframe = document.getElementById('popunderAdIframe');
    if (iframe) {
        iframe.src = POPUNDER_TARGET_URL;
    }

    // 15 seconds countdown
    let remainingSeconds = 15;
    const skipBtn = document.getElementById('popunderSkipBtn');

    if (skipBtn) {
        skipBtn.className = 'interstitial-skip-btn disabled';
        skipBtn.disabled = true;
        skipBtn.innerHTML = `<i class="fa-solid fa-lock"></i> ${remainingSeconds}s`;
    }

    if (popunderCountdownInterval) clearInterval(popunderCountdownInterval);

    popunderCountdownInterval = setInterval(() => {
        remainingSeconds--;
        const currentSkipBtn = document.getElementById('popunderSkipBtn');
        if (currentSkipBtn && remainingSeconds > 0) {
            currentSkipBtn.innerHTML = `<i class="fa-solid fa-lock"></i> ${remainingSeconds}s`;
        }

        if (remainingSeconds <= 0) {
            clearInterval(popunderCountdownInterval);
            if (currentSkipBtn) {
                currentSkipBtn.className = 'interstitial-skip-btn ready';
                currentSkipBtn.disabled = false;
                currentSkipBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Skip Ad`;
            }
        }
    }, 1000);
}
window.showPopunderInterstitial = showPopunderInterstitial;

function closePopunderInterstitial() {
    const modal = document.getElementById('popunderInterstitialModal');
    if (modal) {
        modal.style.display = 'none';
        if (modal.parentElement && modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }
    }
    const iframe = document.getElementById('popunderAdIframe');
    if (iframe) {
        iframe.src = 'about:blank';
    }
    if (popunderCountdownInterval) {
        clearInterval(popunderCountdownInterval);
    }
    isPopunderActive = false;

    // Reset cooldown timer upon closing as well, ensuring full 5 minutes protection
    lastPopunderTime = Date.now();
    localStorage.setItem('vdosky_last_popunder', lastPopunderTime.toString());

    // Resume video playback if playing previously
    if (wasPlayingBeforePopunder) {
        wasPlayingBeforePopunder = false;
        if (currentPlyrInstance) {
            try { currentPlyrInstance.play().catch(() => {}); } catch (e) {}
        }
        const ytIframe = document.getElementById('vdoSkyYouTube');
        if (ytIframe && ytIframe.contentWindow) {
            try {
                ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
            } catch (e) {}
        }
    }

    if (wasForcedLandscapePopunder) {
        wasForcedLandscapePopunder = false;
        const activeBox = document.getElementById('activePlayerBox');
        if (activeBox) activeBox.classList.add('plyr-force-landscape');
    }

    if (wasFullscreenBeforePopunder) {
        wasFullscreenBeforePopunder = false;
        setTimeout(() => {
            if (currentPlyrInstance && currentPlyrInstance.fullscreen) {
                try { currentPlyrInstance.fullscreen.enter(); } catch (e) {}
            } else {
                const box = document.getElementById('activePlayerBox');
                if (box) {
                    if (box.requestFullscreen) {
                        box.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                    } else if (box.webkitRequestFullscreen) {
                        box.webkitRequestFullscreen();
                    }
                }
            }
            lockLandscapeOrientation();
        }, 120);
    }
}
window.closePopunderInterstitial = closePopunderInterstitial;

// Global Click Trigger for Popunder (Every 5 minutes on user click anywhere in the app)
function handleGlobalClickForPopunder(e) {
    if (window.__isVipSubscribed) return;
    // If an ad modal is already visible, do nothing
    if (isPopunderActive || isSmartlinkInterstitialActive) return;

    const target = e.target;
    if (target && (
        target.closest('#popunderInterstitialModal') ||
        target.closest('#smartlinkInterstitialModal') ||
        target.closest('.interstitial-skip-btn') ||
        target.closest('.interstitial-chrome-btn') ||
        target.closest('.interstitial-bottom-bar')
    )) {
        return;
    }

    const now = Date.now();
    const elapsed = now - lastPopunderTime;
    
    // Only trigger if a full 5 minutes have elapsed since the last ad
    if (elapsed >= POPUNDER_COOLDOWN_MS) {
        showPopunderInterstitial();
    }
}

document.addEventListener('click', handleGlobalClickForPopunder, true);
document.addEventListener('touchend', handleGlobalClickForPopunder, { passive: true, capture: true });

// Check timer every 5 seconds to trigger every 15 minutes reliably
setInterval(() => {
    if (window.__isVipSubscribed) return;
    const elapsed = Date.now() - lastInterstitialTime;
    if (elapsed >= INTERSTITIAL_INTERVAL_MS) {
        showSmartlinkInterstitial();
    }
}, 5000);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooterBannerAd);
} else {
    initFooterBannerAd();
}

// ==========================================
// CLOUD STREAM SECTION (NEUTRAL BRANDED STREAM ENGINE)
// ==========================================
let currentCloudCategory = "All";
let cloudStreamSearchDebounce = null;

const INVIDIOUS_INSTANCES = [
    'https://invidious.ducks.party',
    'https://invidious.f5.si',
    'https://inv.nadeko.net',
    'https://invidious.perennialte.ch'
];

async function fetchInvidiousSearch(query) {
    for (const base of INVIDIOUS_INSTANCES) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    return data.map(item => {
                        const sec = item.lengthSeconds || 0;
                        const mins = Math.floor(sec / 60);
                        const durStr = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                        let poster = '';
                        if (item.videoId) {
                            poster = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
                        } else if (item.videoThumbnails && item.videoThumbnails.length > 0) {
                            poster = item.videoThumbnails[item.videoThumbnails.length - 1].url || '';
                        }
                        return {
                            id: `stream_${item.videoId}`,
                            title: item.title || 'Stream Video',
                            category: "Search Results",
                            poster: poster,
                            rating: "4.8",
                            yt: item.videoId,
                            author: item.author || 'Creator',
                            duration: durStr || '10m',
                            views: item.viewCount ? `${(item.viewCount >= 1000000 ? (item.viewCount / 1000000).toFixed(1) + 'M' : item.viewCount >= 1000 ? Math.floor(item.viewCount / 1000) + 'K' : item.viewCount)} views` : 'HD Stream'
                        };
                    });
                }
            }
        } catch (e) {}
    }
    return null;
}

window.openCloudStreamSection = function() {
    isInCloudStreamView = true;
    isPlayerView = false;
    isInCategoryView = false;
    currentCloudCategory = "All";
    updateHeaderButton();

    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown && dropdown.classList.contains("active")) {
        dropdown.classList.remove("active");
    }

    // Connect & Configure Top Search Bar specifically for YouTube / Stream Search
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'Search YouTube videos, creators, music...';
    }
    if (clearBtn) clearBtn.style.display = 'none';

    const container = document.getElementById('mainContainer');
    if (!container) return;

    window.scrollTo({ top: 0, behavior: 'instant' });

    container.innerHTML = `
        <div class="cloud-stream-wrapper">
            <!-- Hero Banner -->
            <div class="cloud-banner-hero">
                <div class="cloud-banner-title">
                    <i class="fa-solid fa-bolt" style="color: #00d2ff;"></i> Watch Stream
                </div>
                <div class="cloud-banner-desc">
                    Stream millions of HD videos, live concerts, web series, and playlists seamlessly with ultra-fast cloud servers.
                </div>
            </div>

            <!-- Category Pills Row -->
            <div class="cloud-pills-row" id="cloudPillsRow">
                <button class="cloud-pill active" onclick="setCloudCategory('All', this)"><i class="fa-solid fa-film" style="margin-right: 4px;"></i> Latest Full Movies</button>
                <button class="cloud-pill" onclick="setCloudCategory('Top Trending Songs', this)">Trending Songs</button>
                <button class="cloud-pill" onclick="setCloudCategory('Hindi Web Series', this)">Web Series</button>
                <button class="cloud-pill" onclick="setCloudCategory('Viral Standup Comedy', this)">Comedy</button>
                <button class="cloud-pill" onclick="setCloudCategory('Popular Gaming Streams', this)">Gaming</button>
                <button class="cloud-pill" onclick="setCloudCategory('Relaxing Lo-Fi & Beats', this)">Lo-Fi & Beats</button>
            </div>

            <!-- Video Grid (Single post per row) -->
            <div id="cloudStreamGrid" class="cloud-stream-grid"></div>
        </div>
    `;

    // Render initial curated videos (with Latest Full Movies prioritized)
    renderCloudVideos(CURATED_CLOUD_CATALOG);

    // Fetch live latest full movies in background to seamlessly augment initial results
    fetchInvidiousSearch('latest full movie').then(liveMovies => {
        if (liveMovies && liveMovies.length > 0 && isInCloudStreamView && currentCloudCategory === 'All') {
            const sInput = document.getElementById('searchInput');
            if (!sInput || sInput.value.trim() === '') {
                const existingYts = new Set(liveMovies.map(m => m.yt));
                const remaining = CURATED_CLOUD_CATALOG.filter(c => !existingYts.has(c.yt));
                renderCloudVideos([...liveMovies, ...remaining]);
            }
        }
    }).catch(() => {});
};

window.performCloudStreamSearch = function(query) {
    if (cloudStreamSearchDebounce) clearTimeout(cloudStreamSearchDebounce);

    if (!query || query.length === 0) {
        renderCloudCategoryFilter(currentCloudCategory);
        return;
    }

    cloudStreamSearchDebounce = setTimeout(async () => {
        const grid = document.getElementById('cloudStreamGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #00d2ff; font-size: 15px;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Searching YouTube for "${query}"...
                </div>
            `;
        }

        // 1. Try local catalog match first
        const lower = query.toLowerCase();
        const localMatches = CURATED_CLOUD_CATALOG.filter(item => 
            (item.title && item.title.toLowerCase().includes(lower)) ||
            (item.author && item.author.toLowerCase().includes(lower)) ||
            (item.category && item.category.toLowerCase().includes(lower))
        );

        // 2. Fetch live online search from Invidious instance
        const liveResults = await fetchInvidiousSearch(query);

        if (liveResults && liveResults.length > 0) {
            // Combine results, prioritizing live results
            const existingIds = new Set(liveResults.map(r => r.yt));
            const extraLocal = localMatches.filter(l => !existingIds.has(l.yt));
            renderCloudVideos([...liveResults, ...extraLocal]);
        } else if (localMatches.length > 0) {
            renderCloudVideos(localMatches);
        } else {
            if (grid) {
                grid.innerHTML = `
                    <div style="text-align: center; padding: 50px 20px; color: #8b949e;">
                        <i class="fa-solid fa-film" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5; display: block;"></i>
                        <div style="font-size: 16px; font-weight: 600; color: #c9d1d9; margin-bottom: 6px;">No YouTube streams found for "${query}"</div>
                        <div style="font-size: 13px;">Try searching with different terms like "Arijit Singh", "Lofi songs", "CarryMinati", or "Short Film".</div>
                    </div>
                `;
            }
        }
    }, 400);
};

window.clearCloudStreamSearch = function() {
    window.clearTopSearch();
};

window.setCloudCategory = function(cat, btn) {
    currentCloudCategory = cat;
    const pills = document.querySelectorAll('.cloud-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    renderCloudCategoryFilter(cat);
};

function renderCloudCategoryFilter(cat) {
    if (cat === 'All') {
        renderCloudVideos(CURATED_CLOUD_CATALOG);
    } else {
        const filtered = CURATED_CLOUD_CATALOG.filter(item => item.category === cat);
        renderCloudVideos(filtered);
    }
}

function renderCloudVideos(videos) {
    currentCloudFilteredList = (videos && videos.length > 0) ? videos : (typeof CURATED_CLOUD_CATALOG !== 'undefined' ? CURATED_CLOUD_CATALOG : []);
    const grid = document.getElementById('cloudStreamGrid');
    if (!grid) return;

    grid.innerHTML = '';
    if (!videos || videos.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; width: 100%; padding: 40px 20px; color: #8b949e;">
                <i class="fa-solid fa-play" style="font-size: 28px; margin-bottom: 10px; opacity: 0.5; display: block;"></i>
                No videos available in this category.
            </div>
        `;
        return;
    }

    let count = 0;
    videos.forEach((video) => {
        count++;
        const card = document.createElement('div');
        card.className = 'cloud-video-card';
        card.onclick = () => {
            playCloudStreamVideo(video);
        };

        const posterSrc = video.poster || `https://i.ytimg.com/vi/${video.yt}/hqdefault.jpg`;

        card.innerHTML = `
            <div class="cloud-thumb-wrapper">
                <img src="${posterSrc}" alt="${video.title || 'Stream'}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60';">
                ${video.duration ? `<span class="cloud-duration-tag">${video.duration}</span>` : ''}
                <span class="cloud-hd-tag">HD</span>
            </div>
            <div class="cloud-video-info">
                <div class="cloud-video-title" title="${video.title || ''}">${video.title || 'Untitled Stream'}</div>
                <div class="cloud-video-meta">
                    <span class="cloud-video-author"><i class="fa-solid fa-circle-user" style="color: #00d2ff; margin-right: 3px;"></i> ${video.author || 'Creator'}</span>
                    <span>${video.views || 'HD Stream'}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Insert native 300x250 ad unit after every 18 video cards (Non-VIP only)
        if (!window.__isVipSubscribed && count % 18 === 0) {
            const adSlot = createAd300x250Element(true);
            adSlot.classList.add('ad-slot-grid-span');
            grid.appendChild(adSlot);
        }
    });
}

function playCloudStreamVideo(video) {
    savedScrollPosition = window.scrollY || window.pageYOffset || 0;
    const movieObj = {
        title: video.title,
        name: video.title,
        poster: video.poster,
        category: video.category || 'Cloud Stream',
        rating: video.rating || '4.8',
        yt: video.yt,
        cast: [video.author || 'Cloud Stream Creator']
    };
    window.openPlayer(movieObj);
}
window.playCloudStreamVideo = playCloudStreamVideo;

fetchMovies();

// ==========================================
// VIP SUBSCRIPTION CONTROLLER & UI
// ==========================================
function subToast(msg) {
    let t = document.getElementById('subToastPill');
    if (!t) {
        t = document.createElement('div');
        t.id = 'subToastPill';
        t.style.position = 'fixed';
        t.style.bottom = '80px';
        t.style.left = '50%';
        t.style.transform = 'translateX(-50%)';
        t.style.background = 'linear-gradient(135deg, #1e1e2f, #2d2d44)';
        t.style.color = '#ffffff';
        t.style.padding = '12px 20px';
        t.style.borderRadius = '25px';
        t.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(197, 75, 255, 0.4)';
        t.style.border = '1px solid #c54bff';
        t.style.zIndex = '999999';
        t.style.fontSize = '13px';
        t.style.fontWeight = '600';
        t.style.pointerEvents = 'none';
        t.style.transition = 'all 0.3s ease';
        t.style.textAlign = 'center';
        t.style.maxWidth = '90%';
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.opacity = '1';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => {
        t.style.opacity = '0';
    }, 3500);
}

window.openSubscriptionSection = function() {
    isInSubscriptionView = true;
    isInCloudStreamView = false;
    isPlayerView = false;
    isInCategoryView = false;
    updateHeaderButton();

    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown && dropdown.classList.contains("active")) {
        dropdown.classList.remove("active");
    }

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'VIP Subscription & Wallet...';
    }
    if (clearBtn) clearBtn.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'instant' });
    renderSubscriptionPage();
};

async function renderSubscriptionPage() {
    const container = document.getElementById('mainContainer');
    if (!container) return;

    const safeId = localStorage.getItem('sub_wallet_safe_id');
    const rawId = localStorage.getItem('sub_wallet_user');

    let userData = null;
    let isSub = false;
    let daysRemaining = 0;
    let expiresAtFormatted = '';

    if (safeId) {
        try {
            const statusCheck = await checkAndHandleSubscriptionExpiry(safeId);
            isSub = statusCheck.isSubscribed;
            window.__isVipSubscribed = isSub;
            daysRemaining = statusCheck.daysRemaining;
            if (statusCheck.expiryDate) {
                expiresAtFormatted = statusCheck.expiryDate.toLocaleDateString() + ' ' + statusCheck.expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            const snap = await get(ref(subscriptionDb, 'users/' + safeId));
            if (snap.exists()) {
                userData = snap.val();
            }
        } catch (e) {
            console.error('Error fetching subscription user:', e);
        }
    }

    const balance = userData ? (Number(userData.balance) || 0) : 0;

    let userCardHtml = '';
    if (safeId && userData) {
        userCardHtml = `
            <div class="sub-wallet-card">
                <div class="sub-wallet-row">
                    <div>
                        <div style="font-size: 11px; color: #8b949e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">User Account</div>
                        <div style="font-size: 16px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                            <i class="fa-solid fa-circle-user" style="color: #00d2ff;"></i> ${userData.identifier || rawId}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: #8b949e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Wallet Balance</div>
                        <div class="sub-wallet-balance-num">₹${balance.toFixed(2)}</div>
                    </div>
                </div>

                <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #2d2d44; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div style="font-size: 11px; color: #8b949e; font-weight: 700;">VIP STATUS</div>
                        <div style="font-size: 14px; font-weight: 800; margin-top: 2px;">
                            ${isSub 
                                ? `<span style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> VIP Active (${daysRemaining} days left)</span>` 
                                : `<span style="color: #ef4444;"><i class="fa-solid fa-circle-xmark"></i> Inactive (Free Plan)</span>`}
                        </div>
                        ${isSub && expiresAtFormatted ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Expires: ${expiresAtFormatted}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.renderSubscriptionPage();" style="background: #25283b; color: #00d2ff; border: 1px solid #3d3d5c; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            <i class="fa-solid fa-arrows-rotate"></i> Refresh
                        </button>
                        <button onclick="window.handleSubLogout();" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            <i class="fa-solid fa-right-from-bracket"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        userCardHtml = `
            <div class="sub-wallet-card" style="border-color: #8A0EDF; box-shadow: 0 8px 25px rgba(138, 14, 223, 0.2);">
                <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-wallet" style="color: #c54bff;"></i> Wallet Login
                </div>
                <div style="font-size: 12px; color: #9ca3af; margin-bottom: 14px; line-height: 1.4;">
                    Select your login method, enter your registered Mobile Number or Gmail and Password/PIN. If you do not have an account, click Login to register.
                </div>
                <div>
                    <label style="display: block; font-size: 12px; font-weight: 700; color: #a0aec0; margin-bottom: 5px;">Login Method:</label>
                    <select id="subLoginTypeSelect" class="sub-select-box" onchange="window.handleSubLoginTypeChange(this.value)">
                        <option value="mobile">📱 Mobile Number</option>
                        <option value="gmail">✉️ Gmail / Email</option>
                    </select>

                    <div id="subIdentifierWrapper">
                        <label id="subIdentifierLabel" style="display: block; font-size: 12px; font-weight: 700; color: #a0aec0; margin-bottom: 5px;">Mobile Number:</label>
                        <input type="tel" id="subIdentifierInput" class="sub-input-box" placeholder="Enter 10-digit Mobile Number (e.g. 9804163298)" autocomplete="tel">
                    </div>

                    <label style="display: block; font-size: 12px; font-weight: 700; color: #a0aec0; margin-bottom: 5px;">Password / PIN:</label>
                    <input type="password" id="subPinInput" class="sub-input-box" placeholder="Enter Password or PIN" autocomplete="current-password">

                    <button id="subLoginBtn" onclick="window.handleSubLoginSubmit()" class="sub-plan-btn" style="padding: 12px 0; font-size: 14px; width: 100%; margin-top: 4px;">
                        <i class="fa-solid fa-right-to-bracket" style="margin-right: 6px;"></i> Login to Wallet
                    </button>
                </div>
            </div>
        `;
    }

    // Plans list
    let plansHtml = '';
    SUBSCRIPTION_PLANS.forEach((plan, index) => {
        const isFeatured = plan.days === 30;
        plansHtml += `
            <div class="sub-plan-card ${isFeatured ? 'featured' : ''}">
                ${isFeatured ? '<div class="sub-plan-badge">MOST POPULAR</div>' : ''}
                <div class="sub-plan-days"><i class="fa-solid fa-calendar-days" style="color:#c54bff; margin-right:4px;"></i> ${plan.days} Days</div>
                <div class="sub-plan-price">₹${plan.price}</div>
                <div style="font-size: 11px; color: #10b981; font-weight: 700; margin-bottom: 12px;">
                    <i class="fa-solid fa-shield-halved"></i> 100% Ad-Free (No Ads)
                </div>
                <button class="sub-plan-btn" onclick="window.handleSubPlanClick(${index})">
                    Pay ₹${plan.price} from Wallet
                </button>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="sub-wrapper">
            <!-- Hero Header -->
            <div class="sub-hero-card">
                <div class="sub-hero-icon"><i class="fa-solid fa-crown"></i></div>
                <div class="sub-hero-title">VDOSKy VIP Ad-Free Zone</div>
                <div class="sub-hero-subtitle">
                    Enjoy unlimited movies and series completely ad-free. Recharge your wallet and activate your VIP subscription with 1-click.
                </div>
            </div>

            <!-- User / Wallet Box -->
            ${userCardHtml}

            <!-- Subscription Plans Header -->
            <div style="margin-top: 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 15px; font-weight: 800; color: #ffffff;">
                    <i class="fa-solid fa-tags" style="color: #FFD700; margin-right: 6px;"></i> VIP Subscription Plans
                </div>
                <div style="font-size: 12px; color: #00d2ff; font-weight: 600;">Instant Activation</div>
            </div>

            <!-- 4 Plans Grid -->
            <div class="sub-plans-grid">
                ${plansHtml}
            </div>

            <!-- Wallet Recharge Instructions -->
            <div class="sub-wallet-card" style="border: 1px dashed #3d3d5c; margin-top: 16px;">
                <div style="font-size: 14px; font-weight: 800; color: #00d2ff; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-circle-info"></i> How to Recharge Wallet?
                </div>
                <div style="font-size: 12px; color: #8b949e; line-height: 1.6;">
                    1. Register your account using your Mobile Number or Gmail.<br>
                    2. Contact the administrator to deposit balance into your wallet.<br>
                    3. Once your balance appears, click on any VIP plan above for instant activation.
                </div>
            </div>
        </div>
    `;
}
window.renderSubscriptionPage = renderSubscriptionPage;

window.handleSubLoginTypeChange = function(type) {
    const label = document.getElementById('subIdentifierLabel');
    const input = document.getElementById('subIdentifierInput');
    if (!label || !input) return;

    if (type === 'gmail') {
        label.innerText = 'Gmail / Email Address:';
        input.type = 'email';
        input.placeholder = 'Enter Gmail Address (e.g. yourname@gmail.com)';
        input.autocomplete = 'email';
    } else {
        label.innerText = 'Mobile Number:';
        input.type = 'tel';
        input.placeholder = 'Enter 10-digit Mobile Number (e.g. 9804163298)';
        input.autocomplete = 'tel';
    }
    input.focus();
};

window.handleSubLoginSubmit = async function() {
    const typeSelect = document.getElementById('subLoginTypeSelect');
    const idInput = document.getElementById('subIdentifierInput');
    const pinInput = document.getElementById('subPinInput');
    if (!idInput || !pinInput) return;

    const loginType = typeSelect ? typeSelect.value : 'mobile';
    const rawId = idInput.value.trim();
    const pin = pinInput.value.trim();

    if (loginType === 'gmail') {
        if (!rawId || !rawId.includes('@') || rawId.length < 5) {
            subToast('Please enter a valid Gmail address (e.g. user@gmail.com)');
            idInput.focus();
            return;
        }
    } else {
        if (!rawId || rawId.length < 6) {
            subToast('Please enter a valid Mobile Number');
            idInput.focus();
            return;
        }
    }

    if (!pin || pin.length < 3) {
        subToast('Please enter your Password or PIN');
        pinInput.focus();
        return;
    }

    const btn = document.getElementById('subLoginBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Verifying...';
    }

    try {
        const res = await loginOrRegisterSubscriptionUser(rawId, pin);
        if (res.success) {
            subToast('✅ Login successful!');
            await refreshSubscriptionState();
            renderSubscriptionPage();
        } else if (res.notRegistered) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="margin-right: 6px;"></i> Login to Wallet';
            }
            window.showNotRegisteredModal(rawId);
        } else {
            subToast('❌ ' + (res.error || 'Login failed'));
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="margin-right: 6px;"></i> Login to Wallet';
            }
        }
    } catch (err) {
        subToast('Login error: ' + (err.message || err));
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="margin-right: 6px;"></i> Login to Wallet';
        }
    }
};

window.showNotRegisteredModal = function(identifier) {
    let modal = document.getElementById('notRegisteredCustomModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notRegisteredCustomModal';
        modal.className = 'custom-sub-modal-backdrop';
        document.body.appendChild(modal);
    }

    const safeDisplayId = String(identifier || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    modal.innerHTML = `
        <div class="custom-sub-modal-card">
            <button class="custom-sub-modal-close" onclick="window.closeNotRegisteredModal()" title="Close">&times;</button>
            <div class="custom-sub-modal-icon">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div class="custom-sub-modal-title">Account Not Registered!</div>
            <div class="custom-sub-modal-subtitle">No Wallet Account Found</div>
            <div class="custom-sub-modal-body">
                No registered wallet account was found for <strong>"${safeDisplayId}"</strong>. To recharge balance and activate your VIP subscription, please register your account.
            </div>
            <div class="custom-sub-modal-actions">
                <button class="custom-sub-modal-register-btn" onclick="window.handleGoToRegister()">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Go to Register
                </button>
                <button class="custom-sub-modal-cancel-btn" onclick="window.closeNotRegisteredModal()">
                    Cancel
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeNotRegisteredModal = function() {
    const modal = document.getElementById('notRegisteredCustomModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.handleGoToRegister = function() {
    window.closeNotRegisteredModal();
    const registerUrl = 'https://appcreator05.blogspot.com/p/add-wallet-apk-creator-app.html';
    if (typeof window.openInChrome === 'function') {
        window.openInChrome(registerUrl);
    } else {
        window.open(registerUrl, '_blank');
    }
};

window.handleSubLogout = function() {
    logoutSubscriptionUser();
    window.__isVipSubscribed = false;
    updateVipAdSuppression();
    subToast('Logged out successfully');
    renderSubscriptionPage();
};

window.handleSubPlanClick = async function(planIndex) {
    const plan = SUBSCRIPTION_PLANS[planIndex];
    if (!plan) return;

    const safeId = localStorage.getItem('sub_wallet_safe_id');
    if (!safeId) {
        subToast('⚠️ Please login with your Mobile Number or Gmail first.');
        window.scrollTo({ top: 120, behavior: 'smooth' });
        const input = document.getElementById('subIdentifierInput');
        if (input) input.focus();
        return;
    }

    // Fetch latest balance from Firebase
    let currentBalance = 0;
    try {
        const snap = await get(ref(subscriptionDb, 'users/' + safeId));
        if (snap.exists()) {
            const data = snap.val();
            currentBalance = Number(data.balance ?? 0);
        }
    } catch (e) {
        console.warn('Could not fetch latest balance before modal:', e);
    }

    window.showSubPaymentConfirmModal(planIndex, currentBalance);
};

window.showSubPaymentConfirmModal = function(planIndex, balance) {
    const plan = SUBSCRIPTION_PLANS[planIndex];
    if (!plan) return;

    let modal = document.getElementById('subPaymentConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'subPaymentConfirmModal';
        modal.className = 'custom-sub-modal-backdrop';
        document.body.appendChild(modal);
    }

    const currentBalance = Number(balance || 0);
    const hasEnough = currentBalance >= plan.price;
    const remainingBalance = currentBalance - plan.price;

    modal.innerHTML = `
        <div class="custom-sub-modal-card">
            <button class="custom-sub-modal-close" onclick="window.closeSubPaymentConfirmModal()" title="Close">&times;</button>
            <div class="custom-sub-modal-icon" style="color: #FFD700; background: rgba(255, 215, 0, 0.15); border-color: #FFD700;">
                <i class="fa-solid fa-crown"></i>
            </div>
            <div class="custom-sub-modal-title">Confirm VIP Subscription</div>
            <div class="custom-sub-modal-subtitle">${plan.days} Days Plan — 100% Ad-Free</div>
            
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid #2d2d44; border-radius: 12px; padding: 14px 16px; margin: 16px 0; text-align: left; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #9ca3af;">Current Wallet Balance:</span>
                    <strong style="color: #00d2ff;">₹${currentBalance.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #9ca3af;">Plan Price:</span>
                    <strong style="color: #ef4444;">- ₹${plan.price.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #2d2d44; padding-top: 8px; margin-top: 4px;">
                    <span style="color: #9ca3af;">Remaining Balance:</span>
                    <strong style="color: ${hasEnough ? '#10b981' : '#ef4444'};">₹${remainingBalance.toFixed(2)}</strong>
                </div>
            </div>

            ${!hasEnough ? `
                <div style="color: #ef4444; font-size: 12px; margin-bottom: 14px; font-weight: 700; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">
                    <i class="fa-solid fa-triangle-exclamation"></i> Insufficient balance! You need ₹${(plan.price - currentBalance).toFixed(2)} more. Please add funds to your wallet.
                </div>
                <div class="custom-sub-modal-actions">
                    <button class="custom-sub-modal-register-btn" onclick="window.handleGoToRegister()">
                        <i class="fa-solid fa-wallet"></i> Recharge Wallet
                    </button>
                    <button class="custom-sub-modal-cancel-btn" onclick="window.closeSubPaymentConfirmModal()">
                        Cancel
                    </button>
                </div>
            ` : `
                <div id="subPaymentErrorBox" style="display: none; color: #ef4444; font-size: 12px; margin-bottom: 12px; font-weight: 700;"></div>
                <div class="custom-sub-modal-actions">
                    <button id="confirmPayActionBtn" class="custom-sub-modal-register-btn" style="background: linear-gradient(135deg, #059669, #10b981); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);" onclick="window.executeSubPayment(${planIndex})">
                        <i class="fa-solid fa-bolt"></i> Pay ₹${plan.price} & Activate VIP
                    </button>
                    <button class="custom-sub-modal-cancel-btn" onclick="window.closeSubPaymentConfirmModal()">
                        Cancel
                    </button>
                </div>
            `}
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeSubPaymentConfirmModal = function() {
    const modal = document.getElementById('subPaymentConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.executeSubPayment = async function(planIndex) {
    const plan = SUBSCRIPTION_PLANS[planIndex];
    if (!plan) return;

    const safeId = localStorage.getItem('sub_wallet_safe_id');
    if (!safeId) return;

    const payBtn = document.getElementById('confirmPayActionBtn');
    const errBox = document.getElementById('subPaymentErrorBox');
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
        const res = await paySubscriptionFromWallet(safeId, plan);
        if (res.success) {
            window.__isVipSubscribed = true;
            updateVipAdSuppression();
            window.closeSubPaymentConfirmModal();
            window.showSubPaymentSuccessModal(plan);
            renderSubscriptionPage();
        } else {
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay ₹${plan.price} & Activate VIP`;
            }
            if (errBox) {
                errBox.textContent = res.error || 'Payment failed. Please check your balance.';
                errBox.style.display = 'block';
            }
            subToast(res.error || 'Payment failed');
        }
    } catch (e) {
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Pay ₹${plan.price} & Activate VIP`;
        }
        if (errBox) {
            errBox.textContent = e.message || 'Payment transaction failed.';
            errBox.style.display = 'block';
        }
        subToast('Payment failed: ' + (e.message || 'Error'));
    }
};

window.showSubPaymentSuccessModal = function(plan) {
    let modal = document.getElementById('subPaymentSuccessModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'subPaymentSuccessModal';
        modal.className = 'custom-sub-modal-backdrop';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="custom-sub-modal-card" style="border-color: #34d399; box-shadow: 0 16px 36px rgba(0,0,0,0.8), 0 0 30px rgba(16, 185, 129, 0.35);">
            <div class="custom-sub-modal-icon" style="color: #34d399; background: rgba(16, 185, 129, 0.2); border-color: #34d399;">
                <i class="fa-solid fa-circle-check"></i>
            </div>
            <div class="custom-sub-modal-title" style="color: #34d399;">Payment Successful!</div>
            <div class="custom-sub-modal-subtitle">${plan.days} Days VIP Activated</div>
            <div class="custom-sub-modal-body">
                🎉 Congratulations! Your <strong>${plan.days} Days VIP Subscription</strong> is now active. All banner, video, and interstitial ads have been completely removed!
            </div>
            <div class="custom-sub-modal-actions">
                <button class="custom-sub-modal-register-btn" style="background: linear-gradient(135deg, #059669, #10b981);" onclick="window.closeSubPaymentSuccessModal(); goHome();">
                    <i class="fa-solid fa-play"></i> Start Watching Ad-Free
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

window.closeSubPaymentSuccessModal = function() {
    const modal = document.getElementById('subPaymentSuccessModal');
    if (modal) {
        modal.style.display = 'none';
    }
};
