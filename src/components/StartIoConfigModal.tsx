import React, { useState } from 'react';
import { X, Check, Sliders, Radio, Play, Shield, Code, Sparkles, Layers } from 'lucide-react';
import { StartIoConfig, AdStats } from '../types';

interface StartIoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StartIoConfig;
  onSaveConfig: (newConfig: StartIoConfig) => void;
  adStats: AdStats;
  onTestInterstitial: () => void;
}

export const StartIoConfigModal: React.FC<StartIoConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  adStats,
  onTestInterstitial
}) => {
  if (!isOpen) return null;

  const [appId, setAppId] = useState(config.appId);
  const [customAdUrl, setCustomAdUrl] = useState(config.customAdUrl || '');
  const [testMode, setTestMode] = useState(config.testMode || false);
  const [enableBanner, setEnableBanner] = useState(config.enableBanner);
  const [enableNative, setEnableNative] = useState(config.enableNative);
  const [enableInterstitial, setEnableInterstitial] = useState(config.enableInterstitial);
  const [skipCountdown, setSkipCountdown] = useState(config.interstitialSkipCountdown);
  const [activeTab, setActiveTab] = useState<'settings' | 'stats' | 'guide'>('settings');

  const handleSave = () => {
    onSaveConfig({
      ...config,
      appId,
      customAdUrl,
      testMode,
      enableBanner,
      enableNative,
      enableInterstitial,
      interstitialSkipCountdown: skipCountdown
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn" role="dialog" aria-modal="true">
      <div className="bg-[#0f1420] border border-cyan-500/40 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#131a2a] border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00b4d8] text-black font-black flex items-center justify-center text-sm shadow">
              S
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Start.io Ads Control Panel
              </h3>
              <p className="text-xs text-cyan-400">
                Banner · Native · Rewarded Video Ads Configuration
              </p>
            </div>
          </div>

          <button
            id="btn-close-ad-config"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-800 bg-[#0c1018] px-4 pt-2 gap-2">
          <button
            id="tab-btn-settings"
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-[#00b4d8] text-[#00b4d8]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Ad Settings
          </button>
          <button
            id="tab-btn-stats"
            onClick={() => setActiveTab('stats')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'stats'
                ? 'border-[#00b4d8] text-[#00b4d8]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Live Performance Stats
          </button>
          <button
            id="tab-btn-guide"
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-[#00b4d8] text-[#00b4d8]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Start.io SDK / Tag Guide
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm flex-1">
          {activeTab === 'settings' && (
            <>
              {/* App ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Start.io Application ID (App ID / Publisher ID):
                </label>
                <div className="flex gap-2">
                  <input
                    id="input-startio-appid"
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="e.g. 208942177"
                    className="flex-1 bg-[#161d2c] border border-gray-700 focus:border-[#00b4d8] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => setAppId('208942177')}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-xl transition-colors font-medium"
                  >
                    Reset Demo ID
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  You can get your real App ID by signing up for free at <strong className="text-cyan-400">portal.start.io</strong>
                </p>
              </div>

              {/* Custom Campaign URL / SmartLink */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Custom Direct Ad Link / SmartLink (Optional):
                </label>
                <input
                  id="input-custom-ad-url"
                  type="url"
                  value={customAdUrl}
                  onChange={(e) => setCustomAdUrl(e.target.value)}
                  placeholder="https://your-smartlink-or-campaign.com (Leave empty for Play Store apps)"
                  className="w-full bg-[#161d2c] border border-gray-700 focus:border-red-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                />
                <p className="text-[11px] text-gray-400">
                  When visitors click ads, they will open this direct campaign link or high-converting Google Play Store apps!
                </p>
              </div>

              {/* Real Ads vs Test Mode */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-950/40 to-cyan-950/30 border border-emerald-500/40 rounded-xl">
                <div>
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                    {testMode ? 'Test Ads Mode' : 'Real Ads Mode (Revenue Active)'}
                  </span>
                  <p className="text-[11px] text-gray-400">
                    {testMode
                      ? 'Displaying test ads. Turn OFF to earn real ad impressions.'
                      : 'Displaying real sponsored campaigns and Google Play apps.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestMode(!testMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !testMode
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {!testMode ? 'REAL ADS: ON' : 'TEST MODE'}
                </button>
              </div>

              {/* Ad Toggles */}
              <div className="bg-[#121824] border border-gray-800 rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Ad Placements Activation
                </div>

                {/* Rewarded Video Ad on Poster Click */}
                <div className="flex items-center justify-between gap-3 p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Poster Click Rewarded Video Ad (HD Unlock)</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Plays full-screen rewarded video commercial on poster click before starting movie
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableInterstitial}
                      onChange={(e) => setEnableInterstitial(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00b4d8]" />
                  </label>
                </div>

                {/* Banner Ad */}
                <div className="flex items-center justify-between gap-3 p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Sticky Bottom Banner Ad</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Standard Start.io banner fixed at screen bottom
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableBanner}
                      onChange={(e) => setEnableBanner(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00b4d8]" />
                  </label>
                </div>

                {/* Native Ads */}
                <div className="flex items-center justify-between gap-3 p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Native Feed Ads</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Blended native cards inside movie rows & under video player
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableNative}
                      onChange={(e) => setEnableNative(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00b4d8]" />
                  </label>
                </div>
              </div>

              {/* Interstitial Skip Timer Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  Interstitial Ad Countdown Timer:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 8].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSkipCountdown(sec)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        skipCountdown === sec
                          ? 'bg-[#00b4d8] text-black border-[#00b4d8]'
                          : 'bg-[#151a28] text-gray-300 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {sec} Seconds Skip
                    </button>
                  ))}
                </div>
              </div>

              {/* Immediate Test Button */}
              <div className="pt-2">
                <button
                  id="btn-test-interstitial-ad"
                  type="button"
                  onClick={() => {
                    onClose();
                    onTestInterstitial();
                  }}
                  className="w-full bg-gradient-to-r from-cyan-600 to-[#00b4d8] hover:from-cyan-500 hover:to-[#0096c7] text-black font-extrabold text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Test Rewarded Video Ad Now (Preview)</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#141b29] border border-gray-800 p-3.5 rounded-xl">
                  <div className="text-xs text-gray-400">Interstitial Shows</div>
                  <div className="text-2xl font-black text-cyan-400 mt-1">
                    {adStats.interstitialImpressions}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Triggered on poster clicks
                  </div>
                </div>

                <div className="bg-[#141b29] border border-gray-800 p-3.5 rounded-xl">
                  <div className="text-xs text-gray-400">Total Ad Clicks</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {adStats.clicks}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    CTR: {((adStats.clicks / Math.max(1, adStats.interstitialImpressions + adStats.bannerImpressions)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-[#141b29] border border-gray-800 p-3.5 rounded-xl">
                  <div className="text-xs text-gray-400">Banner Impressions</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {adStats.bannerImpressions}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Sticky bottom rotation
                  </div>
                </div>

                <div className="bg-[#141b29] border border-gray-800 p-3.5 rounded-xl">
                  <div className="text-xs text-gray-400">Native Impressions</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {adStats.nativeImpressions}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    In-feed & player inline
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-cyan-200">
                <strong>How monetization works:</strong> Start.io pays eCPM for impressions and CPC for ad clicks. Every time a user clicks a movie poster, an interstitial impression is served.
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl">
                <h4 className="font-bold text-cyan-400 mb-1">
                  বাংলা নির্দেশিকা (How to use Start.io with APK / Web):
                </h4>
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  ১. এই অ্যাপটিতে Start.io এর ৩টি অ্যাড ফরম্যাট সম্পূর্ণ কার্যকরী করা হয়েছে:
                  <br />• <strong>Native Ads:</strong> সিনেমার তালিকার সাথে এবং ভিডিও প্লেয়ারের নিচে।
                  <br />• <strong>Banner Ads:</strong> স্ক্রিনের নিচে ফিক্সড ব্যানার।
                  <br />• <strong>Interstitial Ads:</strong> যেকোনো সিনেমার পোস্টারে ক্লিক করলে প্রথমে ৫ সেকেন্ডের ফুলস্ক্রিন অ্যাড আসবে, তারপর মুভি প্লে পেজ লোড হবে।
                </p>
              </div>

              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl">
                <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Android APK Integration (Start.io Android SDK)</span>
                </h4>
                <p className="text-gray-400 text-[11px] mb-2">
                  When packaging this app via Capacitor/Cordova into an APK:
                </p>
                <pre className="bg-black/60 p-2.5 rounded-lg text-[10px] font-mono text-cyan-300 overflow-x-auto">
{`// 1. AndroidManifest.xml
<meta-data android:name="com.startapp.sdk.APPLICATION_ID"
           android:value="${appId}"/>

// 2. MainActivity.java / Kotlin
StartAppSDK.init(this, "${appId}", true);
StartAppAd.showAd(this); // Shows interstitial`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#131a2a] border-t border-gray-800 p-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-black text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Ad Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
};
