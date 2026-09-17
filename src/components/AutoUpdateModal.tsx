import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AppUpdateData, CURRENT_APP_VERSION, triggerApkInstall } from '../services/updateService';
import { VDOSKyLogo } from './VDOSKyLogo';

interface AutoUpdateModalProps {
  isOpen: boolean;
  updateData: AppUpdateData;
  onClose?: () => void;
}

export const AutoUpdateModal: React.FC<AutoUpdateModalProps> = ({
  isOpen,
  updateData
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    const handleProgress = (event: any) => {
      const p = event.detail?.progress;
      if (typeof p === 'number') {
        setDownloadProgress(p);
        if (p < 100) {
          setStatusMessage(`Downloading update... ${p}%`);
        } else {
          setStatusMessage('Launching 1-Click Installer...');
        }
      }
    };

    window.addEventListener('apkDownloadProgress', handleProgress);
    return () => {
      window.removeEventListener('apkDownloadProgress', handleProgress);
    };
  }, []);

  if (!isOpen) return null;

  const isForceUpdate = Boolean(updateData.force_update);

  const handleStartUpdate = () => {
    setIsInstalling(true);
    setDownloadProgress(10);
    setStatusMessage('Downloading APK directly...');

    // Trigger native Android background download & PackageInstaller
    triggerApkInstall(updateData.apk_url, `VDOSKy_${updateData.latest_version}.apk`);

    // Simulated fallback in case event is delayed
    const timeout = setTimeout(() => {
      setDownloadProgress((prev) => (prev !== null && prev < 90 ? 95 : prev));
      setStatusMessage('Preparing installer...');
    }, 2500);

    return () => clearTimeout(timeout);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-[#0f1522] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-white">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-red-600/20 blur-3xl pointer-events-none" />

        {/* Header with App Logo */}
        <div className="flex items-center gap-3 mb-5">
          <VDOSKyLogo size={42} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">
                <span className="text-red-500">VDO</span>Sky
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Update Available
              </span>
            </div>
            <p className="text-xs text-gray-400">
              A newer and faster version is ready to install
            </p>
          </div>
        </div>

        {/* Version comparison card */}
        <div className="p-3.5 rounded-xl bg-gray-900/90 border border-gray-800 flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Current Version</div>
            <div className="text-sm font-black text-gray-300">v{CURRENT_APP_VERSION}</div>
          </div>
          <div className="text-gray-500 font-black text-base">➔</div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Latest Version</div>
            <div className="text-sm font-black text-emerald-400">v{updateData.latest_version}</div>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-5 px-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Official &amp; Verified APK • 1-Click direct install without browser</span>
        </div>

        {/* Progress Bar (if downloading) */}
        {downloadProgress !== null && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-cyan-400">{statusMessage}</span>
              <span className="text-gray-300">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="w-full">
          <button
            id="btn-update-now"
            onClick={handleStartUpdate}
            disabled={isInstalling}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              isInstalling
                ? 'bg-gray-800 text-cyan-400 border border-cyan-500/30 cursor-wait'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-950/50 active:scale-[0.98]'
            }`}
          >
            {isInstalling ? (
              <>
                <CheckCircle2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Update Now (1-Click)</span>
              </>
            )}
          </button>
        </div>

        {isForceUpdate && (
          <p className="text-[10px] text-amber-400 text-center mt-3 font-medium">
            ⚠️ This update is required to continue streaming on VDOSKy.
          </p>
        )}
      </div>
    </div>
  );
};
