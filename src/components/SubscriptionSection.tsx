import React, { useState, useEffect } from 'react';
import {
  Crown,
  Wallet,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Lock,
  Smartphone,
  Mail,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  UserSubscriptionData,
  sanitizeSubscriptionId,
  getStoredUserIdentifier,
  getStoredSafeId,
  checkAndHandleSubscriptionExpiry,
  authenticateSubscriptionUser,
  paySubscriptionFromWallet,
  listenToUserBalance,
  logoutSubscriptionUser
} from '../services/subscriptionService';

interface SubscriptionSectionProps {
  onBack: () => void;
  onSubscriptionStatusChange?: (isSubscribed: boolean) => void;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  onBack,
  onSubscriptionStatusChange
}) => {
  const [currentUser, setCurrentUser] = useState<string | null>(getStoredUserIdentifier());
  const [currentSafeId, setCurrentSafeId] = useState<string | null>(getStoredSafeId());
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Form states for login/register
  const [loginType, setLoginType] = useState<'email' | 'mobile'>('mobile');
  const [userIdInput, setUserIdInput] = useState('');
  const [userPinInput, setUserPinInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Dashboard & Payment states
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successFinalLink, setSuccessFinalLink] = useState<string>('');

  // Active subscription details
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [subExpiryDate, setSubExpiryDate] = useState<Date | null>(null);
  const [subDaysRemaining, setSubDaysRemaining] = useState<number>(0);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);

  // Initialize and check status on mount or when safeId changes
  useEffect(() => {
    if (!currentSafeId) return;

    let isMounted = true;

    // Check expiry & active status
    checkAndHandleSubscriptionExpiry(currentSafeId).then((res) => {
      if (!isMounted) return;
      setHasActiveSub(res.isSubscribed);
      setSubExpiryDate(res.expiryDate);
      setSubDaysRemaining(res.daysRemaining);
      onSubscriptionStatusChange?.(res.isSubscribed);

      if (res.expiredJustNow) {
        setExpiredNotice('Your subscription has expired. The subkey was cleared from Firebase and ads have resumed.');
      }
    });

    // Real-time balance listener
    const unsubscribe = listenToUserBalance(currentSafeId, (bal) => {
      if (isMounted) {
        setWalletBalance(bal);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentSafeId, onSubscriptionStatusChange]);

  // Handle Login / Register submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const rawId = userIdInput.trim();
    const pin = userPinInput.trim();

    if (!rawId) {
      setAuthError(loginType === 'email' ? 'Please enter your Email ID!' : 'Please enter your 10-Digit Mobile Number!');
      return;
    }

    if (loginType === 'mobile' && !/^\d{10}$/.test(rawId)) {
      setAuthError('Please enter a valid 10-digit mobile number (e.g. 9804163298)');
      return;
    }

    if (pin.length !== 4 || isNaN(Number(pin))) {
      setAuthError('Please enter a valid 4-digit numeric PIN!');
      return;
    }

    setIsAuthenticating(true);

    try {
      const res = await authenticateSubscriptionUser(loginType, rawId, pin);
      setIsAuthenticating(false);

      if (res.success && res.user) {
        const safeId = sanitizeSubscriptionId(rawId);
        setCurrentUser(rawId);
        setCurrentSafeId(safeId);

        // Check if user has active subscription
        const statusRes = await checkAndHandleSubscriptionExpiry(safeId);
        setHasActiveSub(statusRes.isSubscribed);
        setSubExpiryDate(statusRes.expiryDate);
        setSubDaysRemaining(statusRes.daysRemaining);
        onSubscriptionStatusChange?.(statusRes.isSubscribed);

        if (statusRes.expiredJustNow) {
          setExpiredNotice('Your previous subscription has expired. The subkey was cleared from Firebase and ads are now active.');
        }
      } else {
        setAuthError(res.error || 'Authentication failed. Please try again.');
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      setAuthError(err.message || 'Connection error. Please try again.');
    }
  };

  // Handle Wallet Payment
  const handleWalletPayment = async () => {
    if (!currentSafeId) return;

    setPaymentError(null);
    const plan = SUBSCRIPTION_PLANS[selectedPlanIndex];

    if (walletBalance < plan.price) {
      setPaymentError(`Insufficient wallet balance! Current balance: ₹${walletBalance.toFixed(2)}. Plan cost: ₹${plan.price}.`);
      return;
    }

    setIsProcessingPayment(true);

    try {
      const result = await paySubscriptionFromWallet(currentSafeId, plan);
      setIsProcessingPayment(false);

      if (result.success) {
        setSuccessFinalLink(result.finalLink || '');
        setShowSuccessScreen(true);
        setHasActiveSub(true);
        setSubDaysRemaining(plan.days);
        if (result.expiresAt) {
          setSubExpiryDate(new Date(result.expiresAt));
        }
        onSubscriptionStatusChange?.(true);
      } else {
        setPaymentError(result.error || 'Payment failed.');
      }
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Payment processing error.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    logoutSubscriptionUser();
    setCurrentUser(null);
    setCurrentSafeId(null);
    setWalletBalance(0);
    setHasActiveSub(false);
    setShowSuccessScreen(false);
    setUserIdInput('');
    setUserPinInput('');
    setPaymentError(null);
    setAuthError(null);
    onSubscriptionStatusChange?.(false);
  };

  const selectedPlan = SUBSCRIPTION_PLANS[selectedPlanIndex];

  return (
    <div id="blogger-sub-root" className="min-h-screen bg-[#0f0f0f] text-white flex flex-col items-center justify-start px-3 py-4 sm:p-6 select-none animate-fadeIn">
      
      {/* Top Navigation Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <button
          id="btn-sub-back"
          onClick={onBack}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 active:scale-95 text-gray-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-gray-700 transition-all cursor-pointer shadow"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back to Movies</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Crown className="w-5 h-5 text-amber-400 fill-current" />
          <span className="text-xs sm:text-sm font-black text-white tracking-wide">
            VDOSKy VIP
          </span>
        </div>
      </div>

      {/* Expiry Notice Banner (shows when auto-expired and subkey deleted) */}
      {expiredNotice && (
        <div className="w-full max-w-md mb-4 bg-red-950/80 border border-red-500/60 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-red-200 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-300">Subscription Expired</div>
            <p className="mt-0.5 text-[11px] text-red-200/90">{expiredNotice}</p>
          </div>
        </div>
      )}

      {/* 1. AUTHENTICATION VIEW (When user is not logged in) */}
      {!currentUser && (
        <div className="bg-[#1c1c1c] border border-gray-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center">
          
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#8A0EDF]/30 to-amber-400/20 border border-[#8A0EDF]/50 flex items-center justify-center mb-3.5 shadow-lg shadow-purple-950/40">
            <Crown className="w-8 h-8 text-[#FFD700] fill-current" />
          </div>

          <h2 className="text-xl font-black text-white mb-1 tracking-wide">
            VIP Subscription
          </h2>
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Login with your Email or Mobile Number to access wallet &amp; ad-free subscription
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {/* Login Type Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Select Login Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginType('mobile');
                    setUserIdInput('');
                    setAuthError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    loginType === 'mobile'
                      ? 'bg-[#8A0EDF] text-white border-purple-400 shadow-md'
                      : 'bg-[#111] text-gray-400 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginType('email');
                    setUserIdInput('');
                    setAuthError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    loginType === 'email'
                      ? 'bg-[#8A0EDF] text-white border-purple-400 shadow-md'
                      : 'bg-[#111] text-gray-400 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
              </div>
            </div>

            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {loginType === 'mobile' ? '10-Digit Mobile Number' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type={loginType === 'mobile' ? 'tel' : 'email'}
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder={loginType === 'mobile' ? '9804163298' : 'example@gmail.com'}
                  maxLength={loginType === 'mobile' ? 10 : undefined}
                  className="w-full bg-[#111] border border-[#8A0EDF]/80 focus:border-[#c54bff] text-white text-sm rounded-xl px-3.5 py-3 outline-none transition-all placeholder:text-gray-600 font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* 4-Digit Security PIN */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                <span>4-Digit Security PIN</span>
                <span className="text-[10px] text-purple-400 font-mono">Numbers only</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={userPinInput}
                  onChange={(e) => setUserPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[#111] border border-[#8A0EDF]/80 focus:border-[#c54bff] text-white text-lg tracking-[0.4em] text-center rounded-xl px-3.5 py-2.5 outline-none transition-all placeholder:text-gray-600 font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Status Messages */}
            {authError && (
              <div className="text-xs text-red-400 bg-red-950/60 border border-red-800/80 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 p-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-[#8A0EDF] to-[#c54bff] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-purple-950/60 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isAuthenticating ? 'Authenticating...' : 'Login / Register'}
            </button>
          </form>

          <p className="text-[11px] text-gray-500 mt-4 leading-normal">
            ⚡ New accounts are automatically registered. Existing accounts are verified with your 4-digit PIN.
          </p>
        </div>
      )}

      {/* 2. PAYMENT & WALLET DASHBOARD (When logged in and not on success screen) */}
      {currentUser && !showSuccessScreen && (
        <div className="bg-[#1c1c1c] border border-gray-800 rounded-3xl p-5 sm:p-7 max-w-sm w-full shadow-2xl text-center">
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center">
                <Crown className="w-4 h-4 text-[#FFD700] fill-current" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black text-white">Premium VIP</div>
                <div className="text-[10px] text-cyan-400 font-mono truncate max-w-[170px]">
                  {currentUser}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-950/80 hover:bg-red-800 text-red-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-700/50 transition-all cursor-pointer"
              title="Logout from Subscription"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>

          {/* ACTIVE SUBSCRIPTION BADGE (If user has valid sub) */}
          {hasActiveSub ? (
            <div className="mb-4 bg-gradient-to-r from-emerald-950/90 to-[#12231c] border border-emerald-500/60 rounded-2xl p-4 text-left shadow-lg">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Subscription Active (100% Ad-Free)</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">
                Enjoy zero ads across all movies &amp; streams
              </div>
              {subExpiryDate && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300/80 mt-2 font-mono">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Valid: {subDaysRemaining} day{subDaysRemaining !== 1 ? 's' : ''} left (Expires {subExpiryDate.toLocaleDateString()})
                  </span>
                </div>
              )}
              <div className="mt-2 text-[10px] text-gray-400 leading-tight">
                ℹ️ When your subscription period ends, the subkey will be automatically deleted from Firebase and ads will resume.
              </div>
            </div>
          ) : (
            /* No Active Subscription Notice */
            <div className="mb-3 p-2 rounded-xl bg-purple-950/30 border border-purple-800/40 text-left flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="text-[11px] text-purple-200">
                Subscribe to remove all Banner, Native &amp; Video Ads.
              </div>
            </div>
          )}

          {/* Professional Wallet Balance Display Box */}
          <div className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border-[1.5px] border-[#8A0EDF] p-4 rounded-2xl mb-4 shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 tracking-wider">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Available Wallet Balance</span>
            </div>
            <div className="text-3xl font-black text-[#38bdf8] mt-1 font-mono tracking-tight">
              ₹{walletBalance.toFixed(2)}
            </div>
          </div>

          {/* Plan Selection Section */}
          <div className="text-left mb-3">
            <label className="block text-xs font-bold text-gray-300 mb-2">
              Select Your Plan:
            </label>

            {/* Interactive Plan Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SUBSCRIPTION_PLANS.map((plan, idx) => {
                const isSelected = idx === selectedPlanIndex;
                return (
                  <button
                    key={plan.days}
                    type="button"
                    onClick={() => {
                      setSelectedPlanIndex(idx);
                      setPaymentError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#8A0EDF]/40 to-purple-900/30 border-[#c54bff] shadow-lg shadow-purple-950/50'
                        : 'bg-[#111] border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-white">{plan.days} Days</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="text-base font-black text-[#FFD700] mt-2 font-mono">
                      ₹{plan.price}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Standard Dropdown fallback matching user's original HTML */}
            <select
              id="planSelect"
              value={selectedPlanIndex}
              onChange={(e) => {
                setSelectedPlanIndex(Number(e.target.value));
                setPaymentError(null);
              }}
              className="w-full bg-[#111] border-[1.5px] border-[#8A0EDF] text-white rounded-xl p-2.5 text-xs font-semibold outline-none cursor-pointer"
            >
              {SUBSCRIPTION_PLANS.map((p, idx) => (
                <option key={p.days} value={idx}>
                  {p.text}
                </option>
              ))}
            </select>
          </div>

          {/* Price Display */}
          <div className="my-3 py-2 px-3 rounded-xl bg-[#111] border border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">Total Payable:</span>
            <span className="text-xl font-black text-[#FFD700] font-mono">
              ₹{selectedPlan.price}
            </span>
          </div>

          {paymentError && (
            <div className="text-xs text-red-400 bg-red-950/60 border border-red-800/80 p-2.5 rounded-xl mb-3 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Pay from Wallet Button */}
          <button
            id="btn-pay-from-wallet"
            onClick={handleWalletPayment}
            disabled={isProcessingPayment}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-[#8A0EDF] to-[#c54bff] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-purple-950/60 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>{isProcessingPayment ? 'Processing...' : 'Pay from Wallet'}</span>
          </button>

          <p className="text-[11px] text-gray-400 mt-3 leading-normal">
            💡 Once purchased, all video ads, interstitials, banners, and native ads are blocked instantly.
          </p>
        </div>
      )}

      {/* 3. SUCCESS SCREEN (When payment succeeds) */}
      {showSuccessScreen && (
        <div className="bg-[#1c1c1c] border border-emerald-500/50 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center mb-4 text-emerald-400">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h3 className="text-xl font-black text-white mb-1.5">
            Subscription Successful!
          </h3>
          <p className="text-xs text-gray-300 mb-4 leading-relaxed">
            Amount deducted from wallet &amp; plan activated! All ads are completely turned off.
          </p>

          <div className="bg-[#111] border border-gray-800 rounded-xl p-3 mb-5 text-left text-xs space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Account:</span>
              <span className="font-mono text-cyan-400">{currentUser}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Duration:</span>
              <span className="font-bold text-white">{selectedPlan.days} Days Ad-Free</span>
            </div>
            {subExpiryDate && (
              <div className="flex justify-between text-gray-400">
                <span>Expires on:</span>
                <span className="font-mono text-amber-400">{subExpiryDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <button
            id="btn-sub-thanks"
            onClick={() => {
              setShowSuccessScreen(false);
              onBack();
            }}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-950/60 cursor-pointer mb-2"
          >
            Thanks &amp; Return to Movies
          </button>

          {successFinalLink && (
            <a
              href={successFinalLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-cyan-400 mt-2 underline"
            >
              <span>Open Plan Confirmation Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

    </div>
  );
};
