/**
 * System Bars & Immersive Fullscreen Utility
 * Completely eliminates both top Android status bar and bottom navigation bar
 * (Back, Home, Recents buttons) to deliver a true 100% edge-to-edge fullscreen app.
 */

export const hideSystemNavigation = async () => {
  // 0. Direct Native Android Bridge call if available
  try {
    if ((window as any).Android && typeof (window as any).Android.hideSystemBars === 'function') {
      (window as any).Android.hideSystemBars();
    }
  } catch {}

  // 1. Android WindowInsetsControllerCompat Immersive Mode (@boengli/capacitor-fullscreen)
  // This directly instructs Android OS to hide system navigation bars & status bars
  try {
    const { Fullscreen } = await import('@boengli/capacitor-fullscreen');
    await Fullscreen.activateImmersiveMode();
  } catch {
    // Graceful fallback for non-native web environment
  }

  // 2. Capacitor Android Navigation Bar Plugin (@capawesome/capacitor-navigation-bar)
  // Hide navigation bar directly without setting solid background color
  try {
    const { NavigationBar } = await import('@capawesome/capacitor-navigation-bar');
    await NavigationBar.hide();
  } catch {
    // Graceful fallback for non-native web environment
  }

  // 3. Capacitor Android Status Bar Plugin (@capacitor/status-bar)
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    await StatusBar.hide().catch(() => {});
  } catch {
    // Graceful fallback for non-native web environment
  }
};

export const showSystemNavigation = async () => {
  // 1. Deactivate Immersive Mode
  try {
    const { Fullscreen } = await import('@boengli/capacitor-fullscreen');
    await Fullscreen.deactivateImmersiveMode();
  } catch {}

  // 2. Capacitor Navigation Bar
  try {
    const { NavigationBar } = await import('@capawesome/capacitor-navigation-bar');
    await NavigationBar.show();
  } catch {}

  // 3. Capacitor Status Bar
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.show();
  } catch {}

  // 4. Web Fullscreen Exit
  try {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    }
  } catch {}
};

export const toggleSystemNavigation = async (): Promise<boolean> => {
  const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
  if (isFs) {
    await showSystemNavigation();
    return false;
  } else {
    await hideSystemNavigation();
    return true;
  }
};
