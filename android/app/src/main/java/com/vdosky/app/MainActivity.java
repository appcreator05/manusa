package com.vdosky.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.startapp.sdk.adsbase.StartAppAd;
import com.startapp.sdk.adsbase.StartAppSDK;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {

    @CapacitorPlugin(name = "AppUpdate")
    public static class AppUpdatePlugin extends Plugin {
        @PluginMethod
        public void installApk(PluginCall call) {
            String url = call.getString("url");
            String fileName = call.getString("fileName");
            MainActivity activity = (MainActivity) getActivity();
            if (activity != null) {
                activity.startDirectApkDownload(url, fileName);
            }
            call.resolve();
        }
    }

    private AndroidNativeInterface nativeInterface;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);

        // Keep mobile screen always on while VDOSky app is open
        try {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Apply true edge-to-edge fullscreen immersive mode hiding status bar & system navigation
        hideSystemBars();

        // Initialize Start.io Native In-App SDK with App ID: 203877183
        // false = Live production ads (counts real Impressions, Clicks, and Revenue)
        StartAppSDK.init(this, "203877183", false);
        StartAppSDK.enableReturnAds(false);

        nativeInterface = new AndroidNativeInterface();
        setupJavascriptBridge();
        nativeInterface.preloadRewardedVideo();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupJavascriptBridge();
        hideSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } catch (Exception e) {
            e.printStackTrace();
        }
        setupJavascriptBridge();
        hideSystemBars();
        if (nativeInterface != null) {
            nativeInterface.preloadRewardedVideo();
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    public void hideSystemBars() {
        runOnUiThread(() -> {
            try {
                Window window = getWindow();
                if (window == null) return;

                // Configure cutout display mode to render edge-to-edge behind camera notches on Android 9+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    WindowManager.LayoutParams lp = window.getAttributes();
                    lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    window.setAttributes(lp);
                }

                // Explicitly add FLAG_FULLSCREEN and FLAG_LAYOUT_NO_LIMITS for uncompromising edge-to-edge
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
                window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

                // WindowCompat setup for modern Android (Android 11 / API 30+)
                WindowCompat.setDecorFitsSystemWindows(window, false);
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                if (controller != null) {
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                    controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }

                // Sticky immersive flags
                View decorView = window.getDecorView();
                if (decorView != null) {
                    decorView.setFitsSystemWindows(false);
                    decorView.setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    );
                    
                    // Re-apply whenever visibility changes
                    decorView.setOnSystemUiVisibilityChangeListener(visibility -> {
                        if ((visibility & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                            decorView.setSystemUiVisibility(
                                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            );
                        }
                    });
                }

                // Ensure the underlying Capacitor WebView fitsSystemWindows is set to false
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().setFitsSystemWindows(false);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    private void setupJavascriptBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                if (nativeInterface == null) {
                    nativeInterface = new AndroidNativeInterface();
                }
                getBridge().getWebView().addJavascriptInterface(nativeInterface, "Android");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class AndroidNativeInterface {
        private StartAppAd rewardedVideoAd = null;
        private boolean isAdLoading = false;

        public void preloadRewardedVideo() {
            runOnUiThread(() -> {
                try {
                    if (isAdLoading) return;
                    isAdLoading = true;
                    if (rewardedVideoAd == null) {
                        rewardedVideoAd = new StartAppAd(MainActivity.this);
                    }
                    rewardedVideoAd.setVideoListener(new com.startapp.sdk.adsbase.adlisteners.VideoListener() {
                        @Override
                        public void onVideoCompleted() {
                            notifyRewardCompleted();
                        }
                    });
                    rewardedVideoAd.loadAd(StartAppAd.AdMode.REWARDED_VIDEO, new com.startapp.sdk.adsbase.adlisteners.AdEventListener() {
                        @Override
                        public void onReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                            isAdLoading = false;
                        }

                        @Override
                        public void onFailedToReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                            isAdLoading = false;
                        }
                    });
                } catch (Exception e) {
                    isAdLoading = false;
                    e.printStackTrace();
                }
            });
        }

        private void notifyRewardCompleted() {
            runOnUiThread(() -> {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "window.onAndroidRewardedVideoCompleted && window.onAndroidRewardedVideoCompleted()", 
                            null
                        );
                    }
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void showRewardedVideo() {
            runOnUiThread(() -> {
                try {
                    if (rewardedVideoAd != null && rewardedVideoAd.isReady()) {
                        rewardedVideoAd.showAd(new com.startapp.sdk.adsbase.adlisteners.AdDisplayListener() {
                            @Override
                            public void adHidden(com.startapp.sdk.adsbase.Ad ad) {
                                // Called when Start.io fullscreen ad finishes or user clicks Skip/Close
                                notifyRewardCompleted();
                                preloadRewardedVideo();
                            }

                            @Override
                            public void adDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                            }

                            @Override
                            public void adClicked(com.startapp.sdk.adsbase.Ad ad) {
                            }

                            @Override
                            public void adNotDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                                notifyRewardCompleted();
                                preloadRewardedVideo();
                            }
                        });
                        return;
                    }

                    // If not ready, load and show directly
                    final StartAppAd directAd = new StartAppAd(MainActivity.this);
                    directAd.setVideoListener(new com.startapp.sdk.adsbase.adlisteners.VideoListener() {
                        @Override
                        public void onVideoCompleted() {
                            notifyRewardCompleted();
                        }
                    });
                    directAd.loadAd(StartAppAd.AdMode.REWARDED_VIDEO, new com.startapp.sdk.adsbase.adlisteners.AdEventListener() {
                        @Override
                        public void onReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                            directAd.showAd(new com.startapp.sdk.adsbase.adlisteners.AdDisplayListener() {
                                @Override
                                public void adHidden(com.startapp.sdk.adsbase.Ad ad) {
                                    notifyRewardCompleted();
                                    preloadRewardedVideo();
                                }

                                @Override
                                public void adDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                                }

                                @Override
                                public void adClicked(com.startapp.sdk.adsbase.Ad ad) {
                                }

                                @Override
                                public void adNotDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                                    notifyRewardCompleted();
                                    preloadRewardedVideo();
                                }
                            });
                        }

                        @Override
                        public void onFailedToReceiveAd(com.startapp.sdk.adsbase.Ad ad) {
                            // Fallback to interstitial or unlock stream directly
                            StartAppAd fallback = new StartAppAd(MainActivity.this);
                            fallback.showAd(new com.startapp.sdk.adsbase.adlisteners.AdDisplayListener() {
                                @Override
                                public void adHidden(com.startapp.sdk.adsbase.Ad ad) {
                                    notifyRewardCompleted();
                                    preloadRewardedVideo();
                                }

                                @Override
                                public void adDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                                }

                                @Override
                                public void adClicked(com.startapp.sdk.adsbase.Ad ad) {
                                }

                                @Override
                                public void adNotDisplayed(com.startapp.sdk.adsbase.Ad ad) {
                                    notifyRewardCompleted();
                                    preloadRewardedVideo();
                                }
                            });
                        }
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                    notifyRewardCompleted();
                }
            });
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> StartAppAd.showAd(MainActivity.this));
        }

        @JavascriptInterface
        public void showBanner() {
        }

        @JavascriptInterface
        public void trackImpression(String adId) {
        }

        @JavascriptInterface
        public void trackClick(String adId) {
        }

        @JavascriptInterface
        public void setLandscape() {
            runOnUiThread(() -> {
                try {
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void setPortrait() {
            runOnUiThread(() -> {
                try {
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void unlockOrientation() {
            runOnUiThread(() -> {
                try {
                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean enable) {
            runOnUiThread(() -> {
                try {
                    if (enable) {
                        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void hideSystemBars() {
            MainActivity.this.hideSystemBars();
        }

        @JavascriptInterface
        public void shareApp(final String text, final String url) {
            runOnUiThread(() -> {
                try {
                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("text/plain");
                    String finalBody = (text != null && !text.trim().isEmpty()) ? text.trim() + "\n" + url : url;
                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, "VDOSky App");
                    shareIntent.putExtra(Intent.EXTRA_TEXT, finalBody);
                    Intent chooser = Intent.createChooser(shareIntent, "Share VDOSky App via");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(chooser);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void downloadAndInstallApk(final String downloadUrl, final String fileName) {
            startDirectApkDownload(downloadUrl, fileName);
        }
    }

    public void startDirectApkDownload(final String downloadUrl, final String fileName) {
        if (downloadUrl == null || downloadUrl.trim().isEmpty()) return;

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream in = null;
            FileOutputStream out = null;
            try {
                final String apkFileName = (fileName != null && !fileName.trim().isEmpty())
                        ? fileName.trim()
                        : "VDOSKy_latest.apk";

                // Save to app-specific external files dir (NO storage permission required on any Android version)
                File downloadDir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "updates");
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }

                File apkFile = new File(downloadDir, apkFileName);
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                // Connect with redirect support (GitHub / CDN 301/302 redirects)
                URL url = new URL(downloadUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                connection.connect();

                int responseCode = connection.getResponseCode();
                // Handle manual redirect if needed
                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                    responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                    responseCode == 307 || responseCode == 308) {
                    String newUrl = connection.getHeaderField("Location");
                    connection.disconnect();
                    url = new URL(newUrl);
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.connect();
                }

                int fileLength = connection.getContentLength();
                in = connection.getInputStream();
                out = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                long total = 0;
                int count;
                int lastReportedPercent = -1;

                while ((count = in.read(buffer)) != -1) {
                    total += count;
                    out.write(buffer, 0, count);

                    if (fileLength > 0) {
                        int percent = (int) ((total * 100) / fileLength);
                        if (percent != lastReportedPercent && percent % 5 == 0) {
                            lastReportedPercent = percent;
                            dispatchProgressToWebView(percent);
                        }
                    }
                }

                out.flush();
                dispatchProgressToWebView(100);

                // APK download complete! Trigger native package installer directly
                if (apkFile.exists() && apkFile.length() > 0) {
                    runOnUiThread(() -> launchPackageInstaller(apkFile));
                }

            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                try {
                    if (out != null) out.close();
                    if (in != null) in.close();
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void dispatchProgressToWebView(final int percent) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String script = "window.dispatchEvent(new CustomEvent('apkDownloadProgress', { detail: { progress: " + percent + " } }));";
                    getBridge().getWebView().evaluateJavascript(script, null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void launchPackageInstaller(File apkFile) {
        try {
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apkFile);
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

            startActivity(installIntent);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
