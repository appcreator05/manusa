let wakeLockSentinel: any = null;

/**
 * Requests that the device screen stays continuously on while the app is open.
 * Supports both Android Native APK bridge and the modern Web Screen Wake Lock API.
 */
export async function requestScreenWakeLock() {
  // 1. Android Native APK Bridge
  if (typeof window !== 'undefined' && (window as any).Android && typeof (window as any).Android.keepScreenOn === 'function') {
    try {
      (window as any).Android.keepScreenOn(true);
    } catch (e) {
      console.warn('Native keepScreenOn error:', e);
    }
  }

  // 2. Modern Web Screen Wake Lock API
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof (navigator as any).wakeLock.request === 'function') {
    try {
      if (!wakeLockSentinel || wakeLockSentinel.released) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch {
      // Wake lock requests can fail if tab is hidden or device has strict battery-saver policy
    }
  }
}

/**
 * Releases the screen wake lock when the app is suspended.
 */
export function releaseScreenWakeLock() {
  if (typeof window !== 'undefined' && (window as any).Android && typeof (window as any).Android.keepScreenOn === 'function') {
    try {
      (window as any).Android.keepScreenOn(false);
    } catch (e) {}
  }

  if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}
