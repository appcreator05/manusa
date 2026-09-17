// Utility to communicate directly with Android APK Start.io Native SDK
// Supports WebView, Website 2 APK Builder, Capacitor, Cordova, and Custom Android Interfaces

export const START_IO_APP_ID = '203877183';

declare global {
  interface Window {
    Android?: {
      showInterstitial?: () => void;
      showBanner?: () => void;
      showRewardedVideo?: () => void;
      trackImpression?: (adId: string) => void;
      trackClick?: (adId: string) => void;
      [key: string]: any;
    };
    StartApp?: {
      showInterstitial?: () => void;
      showBanner?: () => void;
      showRewardedVideo?: () => void;
      [key: string]: any;
    };
    startApp?: any;
    Website2APK?: {
      showInterstitial?: () => void;
      showBanner?: () => void;
      [key: string]: any;
    };
    showInterstitial?: () => void;
    showBanner?: () => void;
    showRewardedVideo?: () => void;
    onAndroidRewardedVideoCompleted?: () => void;
  }
}

/**
 * Check if the application is currently running inside the native Android APK environment
 */
export function isNativeAndroidApk(): boolean {
  return typeof window !== 'undefined' && Boolean(
    (window.Android && typeof window.Android.showRewardedVideo === 'function') ||
    (window.StartApp && typeof window.StartApp.showRewardedVideo === 'function') ||
    (window.Website2APK && typeof window.Website2APK.showRewardedVideo === 'function') ||
    typeof window.showRewardedVideo === 'function'
  );
}

/**
 * Trigger Android Native Start.io Rewarded Video Ad
 * Invoked when movie poster is clicked to unlock HD movie stream
 */
export function triggerNativeStartIoRewardedVideo(onRewardGranted?: () => void): boolean {
  try {
    if (onRewardGranted) {
      window.onAndroidRewardedVideoCompleted = () => {
        console.log('[Start.io APK] Native Rewarded Video completed! Granting reward.');
        onRewardGranted();
      };
    }

    // 1. Check custom Android JavaScriptInterface
    if (window.Android && typeof window.Android.showRewardedVideo === 'function') {
      window.Android.showRewardedVideo();
      console.log('[Start.io APK] Triggered window.Android.showRewardedVideo()');
      return true;
    }

    // 2. Check window.StartApp interface
    if (window.StartApp && typeof window.StartApp.showRewardedVideo === 'function') {
      window.StartApp.showRewardedVideo();
      console.log('[Start.io APK] Triggered window.StartApp.showRewardedVideo()');
      return true;
    }

    // 3. Check Website 2 APK Builder interface
    if (window.Website2APK && typeof window.Website2APK.showRewardedVideo === 'function') {
      window.Website2APK.showRewardedVideo();
      console.log('[Start.io APK] Triggered window.Website2APK.showRewardedVideo()');
      return true;
    }

    // 4. Check global function showRewardedVideo
    if (typeof window.showRewardedVideo === 'function') {
      window.showRewardedVideo();
      console.log('[Start.io APK] Triggered window.showRewardedVideo()');
      return true;
    }
  } catch (err) {
    console.error('[Start.io APK Rewarded Video Error]', err);
  }
  return false;
}

/**
 * Trigger Android Native Start.io Interstitial Ad
 * Invoked on category navigation or manual test
 */
export function triggerNativeStartIoInterstitial(): boolean {
  try {
    // 1. Check custom Android JavaScriptInterface
    if (window.Android && typeof window.Android.showInterstitial === 'function') {
      window.Android.showInterstitial();
      console.log('[Start.io APK] Triggered window.Android.showInterstitial()');
      return true;
    }

    // 2. Check window.StartApp interface
    if (window.StartApp && typeof window.StartApp.showInterstitial === 'function') {
      window.StartApp.showInterstitial();
      console.log('[Start.io APK] Triggered window.StartApp.showInterstitial()');
      return true;
    }

    // 3. Check Website 2 APK Builder interface
    if (window.Website2APK && typeof window.Website2APK.showInterstitial === 'function') {
      window.Website2APK.showInterstitial();
      console.log('[Start.io APK] Triggered window.Website2APK.showInterstitial()');
      return true;
    }

    // 4. Check global function showInterstitial
    if (typeof window.showInterstitial === 'function') {
      window.showInterstitial();
      console.log('[Start.io APK] Triggered window.showInterstitial()');
      return true;
    }
  } catch (err) {
    console.error('[Start.io APK Bridge Error]', err);
  }
  return false;
}

/**
 * Trigger Android Native Start.io Banner Ad
 */
export function triggerNativeStartIoBanner(): boolean {
  try {
    if (window.Android && typeof window.Android.showBanner === 'function') {
      window.Android.showBanner();
      return true;
    }
    if (window.StartApp && typeof window.StartApp.showBanner === 'function') {
      window.StartApp.showBanner();
      return true;
    }
    if (window.Website2APK && typeof window.Website2APK.showBanner === 'function') {
      window.Website2APK.showBanner();
      return true;
    }
    if (typeof window.showBanner === 'function') {
      window.showBanner();
      return true;
    }
  } catch (err) {
    console.error('[Start.io APK Banner Error]', err);
  }
  return false;
}

/**
 * Signal Native Android Click/Impression Tracking to Native Start.io SDK
 */
export function reportStartIoInteraction(type: 'impression' | 'click', adId: string = 'general') {
  try {
    if (window.Android) {
      if (type === 'impression' && typeof window.Android.trackImpression === 'function') {
        window.Android.trackImpression(adId);
      } else if (type === 'click' && typeof window.Android.trackClick === 'function') {
        window.Android.trackClick(adId);
      }
    }
  } catch (e) {
    // Ignore bridge errors in non-Android environments
  }
}

/**
 * Open external URL directly in Google Chrome App
 */
export function openUrlInChrome(url: string) {
  if (!url) return;
  if (typeof window !== 'undefined' && typeof (window as any).openInChrome === 'function') {
    (window as any).openInChrome(url);
    return;
  }
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
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
}
