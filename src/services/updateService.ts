import { ref, get } from 'firebase/database';
import { firebaseDb, firebaseConfig } from './firebaseConfig';

export const CURRENT_APP_VERSION = '1.0.2';

export interface AppUpdateData {
  latest_version: string;
  apk_url: string;
  changelog?: string;
  force_update?: boolean;
  release_date?: string;
  title?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  updateData: AppUpdateData | null;
}

/**
 * Compare semantic versions (e.g., '1.0.1' > '1.0.0')
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Check Firebase Realtime Database for app updates
 * Checks both Firebase JS SDK and direct REST endpoint fallback
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  let remoteData: any = null;

  // 1. First attempt: Direct Firebase RTDB REST API (fastest & works anywhere)
  try {
    const rtdbUrl = `${firebaseConfig.databaseURL}/app_update.json`;
    const response = await fetch(rtdbUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (response.ok) {
      remoteData = await response.json();
    }
  } catch (err) {
    console.warn('[UpdateService] RTDB REST check failed, trying SDK:', err);
  }

  // 2. Second attempt: Firebase SDK get()
  if (!remoteData) {
    try {
      const updateRef = ref(firebaseDb, 'app_update');
      const snapshot = await get(updateRef);
      if (snapshot.exists()) {
        remoteData = snapshot.val();
      }
    } catch (err) {
      console.warn('[UpdateService] Firebase SDK fetch failed:', err);
    }
  }

  // 3. Evaluate if update exists
  if (remoteData) {
    const latestVersion = remoteData.latest_version || remoteData.version || remoteData.latestVersion;
    const apkUrl = remoteData.apk_url || remoteData.apkUrl || remoteData.download_url;

    if (latestVersion && apkUrl) {
      const isNewer = compareVersions(latestVersion, CURRENT_APP_VERSION) > 0;
      return {
        hasUpdate: isNewer,
        currentVersion: CURRENT_APP_VERSION,
        updateData: {
          latest_version: latestVersion,
          apk_url: apkUrl,
          changelog: remoteData.changelog || remoteData.notes || 'Performance improvements and bug fixes.',
          force_update: Boolean(remoteData.force_update ?? remoteData.forceUpdate ?? false),
          release_date: remoteData.release_date || remoteData.releaseDate,
          title: remoteData.title || 'New Update Available!'
        }
      };
    }
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    updateData: null
  };
}

/**
 * Trigger APK download & native 1-click install
 * Purely in-app download and native Android PackageInstaller execution
 */
export function triggerApkInstall(apkUrl: string, fileName?: string): boolean {
  if (!apkUrl) return false;

  const targetName = fileName || `VDOSKy_update_${Date.now()}.apk`;

  // 1. Try Capacitor Native Plugin first
  try {
    const cap = (window as any).Capacitor;
    if (cap && cap.Plugins && cap.Plugins.AppUpdate && typeof cap.Plugins.AppUpdate.installApk === 'function') {
      console.log('[UpdateService] Calling Capacitor.Plugins.AppUpdate.installApk');
      cap.Plugins.AppUpdate.installApk({ url: apkUrl, fileName: targetName });
      return true;
    }
  } catch (err) {
    console.warn('[UpdateService] Capacitor plugin trigger exception:', err);
  }

  // 2. Try Android Native JavascriptInterface
  if (window.Android && typeof window.Android.downloadAndInstallApk === 'function') {
    try {
      console.log('[UpdateService] Calling native Android.downloadAndInstallApk');
      window.Android.downloadAndInstallApk(apkUrl, targetName);
      return true;
    } catch (err) {
      console.error('[UpdateService] Failed calling native Android.downloadAndInstallApk:', err);
    }
  }

  return false;
}
