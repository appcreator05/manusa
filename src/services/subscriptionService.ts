import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  runTransaction,
  onValue,
  push,
  Unsubscribe
} from 'firebase/database';

// Dedicated Firebase Configuration for Wallet Balance Deduction & Subscription System
export const subscriptionFirebaseConfig = {
  apiKey: "AIzaSyAPPdw4tLtXfkzaBAJk-DBC5KLyp8Jzu5w",
  authDomain: "update-2224e.firebaseapp.com",
  databaseURL: "https://update-2224e-default-rtdb.firebaseio.com",
  projectId: "update-2224e",
  storageBucket: "update-2224e.firebasestorage.app",
  messagingSenderId: "731168193501",
  appId: "1:731168193501:web:239c7be0fc864c7ca9d434"
};

// Named singleton app for subscription to prevent collision with any existing default Firebase app
export const subscriptionApp = getApps().some((a) => a.name === 'subscriptionApp')
  ? getApp('subscriptionApp')
  : initializeApp(subscriptionFirebaseConfig, 'subscriptionApp');

export const subscriptionDb = getDatabase(subscriptionApp);

export interface SubscriptionPlan {
  days: number;
  price: number;
  link: string;
  text: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    days: 7,
    price: 30,
    link: "intent://imdb-review-go.blogspot.com/p/seven-day-button.html#Intent;scheme=https;package=com.paid.version;end",
    text: "7 Days — ₹30"
  },
  {
    days: 30,
    price: 70,
    link: "intent://imdb-review-go.blogspot.com/p/thirty-days-button.html#Intent;scheme=https;package=com.paid.version;end",
    text: "30 Days — ₹70"
  },
  {
    days: 180,
    price: 600,
    link: "intent://imdb-review-go.blogspot.com/p/six-months-button.html#Intent;scheme=https;package=com.paid.version;end",
    text: "180 Days — ₹600"
  },
  {
    days: 365,
    price: 800,
    link: "intent://imdb-review-go.blogspot.com/p/towel-month-button.html#Intent;scheme=https;package=com.paid.version;end",
    text: "365 Days — ₹800"
  }
];

export interface UserSubscriptionData {
  type: 'email' | 'mobile';
  identifier: string; // e.g. "9804163298"
  pin: string;
  password?: string;
  balance: number;
  subscription_status?: 'active' | 'expired' | 'none';
  subscription?: string;
  plan_days?: number;
  purchased_at?: string;
  expires_at?: string;
  createdAt?: string;
  transactions?: Record<string, any>;
}

export interface SubscriptionStatusCheck {
  isSubscribed: boolean;
  userData: UserSubscriptionData | null;
  expiredJustNow: boolean;
  daysRemaining: number;
  expiryDate: Date | null;
  message?: string;
}

export function sanitizeSubscriptionId(rawId: string): string {
  return rawId.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "_");
}

export function getStoredUserIdentifier(): string | null {
  return localStorage.getItem('sub_wallet_user');
}

export function getStoredSafeId(): string | null {
  return localStorage.getItem('sub_wallet_safe_id');
}

export function getCachedIsSubscribed(): boolean {
  try {
    const isSub = localStorage.getItem('vdosky_sub_active') === '1';
    const expiresAtStr = localStorage.getItem('vdosky_sub_expires_at');
    if (isSub && expiresAtStr) {
      const exp = new Date(expiresAtStr);
      if (new Date() < exp) {
        return true;
      } else {
        // Expired in cache
        localStorage.removeItem('vdosky_sub_active');
        localStorage.removeItem('vdosky_sub_expires_at');
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks subscription status against Firebase.
 * If expired:
 * 1. Automatically deletes the subscription subkey from Firebase (setting to null / removing expired subkeys).
 * 2. Clears local active flags.
 * 3. Immediately re-enables the ads system.
 */
export async function checkAndHandleSubscriptionExpiry(safeId: string): Promise<SubscriptionStatusCheck> {
  if (!safeId) {
    return {
      isSubscribed: false,
      userData: null,
      expiredJustNow: false,
      daysRemaining: 0,
      expiryDate: null
    };
  }

  try {
    const userRef = ref(subscriptionDb, `users/${safeId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      localStorage.removeItem('vdosky_sub_active');
      localStorage.removeItem('vdosky_sub_expires_at');
      return {
        isSubscribed: false,
        userData: null,
        expiredJustNow: false,
        daysRemaining: 0,
        expiryDate: null
      };
    }

    const user = snapshot.val() as UserSubscriptionData;

    // Check expiry
    if (user.expires_at) {
      const expiryDate = new Date(user.expires_at);
      const now = new Date();

      if (now > expiryDate) {
        // 🔥 Expired! Delete subkeys from Firebase as requested:
        console.warn(`[Subscription] User ${user.identifier || safeId} expired on ${expiryDate.toISOString()}. Removing subkey from Firebase...`);

        try {
          await update(userRef, {
            subscription_status: null,
            expires_at: null,
            plan_days: null,
            purchased_at: null,
            subscription: "none"
          });
        } catch (delErr) {
          console.error('[Subscription] Failed to remove subkeys from Firebase:', delErr);
        }

        // Clean local state
        localStorage.removeItem('vdosky_sub_active');
        localStorage.removeItem('vdosky_sub_expires_at');
        localStorage.setItem('vdosky_sub_expired_notice', '1');

        return {
          isSubscribed: false,
          userData: {
            ...user,
            subscription_status: 'expired',
            expires_at: undefined,
            plan_days: undefined
          },
          expiredJustNow: true,
          daysRemaining: 0,
          expiryDate,
          message: 'Subscription has expired. Subkey removed from Firebase and Ads are now active.'
        };
      } else {
        // Valid subscription!
        const diffMs = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        localStorage.setItem('vdosky_sub_active', '1');
        localStorage.setItem('vdosky_sub_expires_at', user.expires_at);

        return {
          isSubscribed: true,
          userData: user,
          expiredJustNow: false,
          daysRemaining,
          expiryDate
        };
      }
    }

    // No active subscription keys
    localStorage.removeItem('vdosky_sub_active');
    localStorage.removeItem('vdosky_sub_expires_at');

    return {
      isSubscribed: false,
      userData: user,
      expiredJustNow: false,
      daysRemaining: 0,
      expiryDate: null
    };
  } catch (err: any) {
    console.error('[Subscription] Error checking subscription:', err);

    // Local fallback check
    const cachedActive = localStorage.getItem('vdosky_sub_active') === '1';
    const cachedExpiry = localStorage.getItem('vdosky_sub_expires_at');
    if (cachedActive && cachedExpiry) {
      const exp = new Date(cachedExpiry);
      if (new Date() < exp) {
        return {
          isSubscribed: true,
          userData: null,
          expiredJustNow: false,
          daysRemaining: Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          expiryDate: exp
        };
      } else {
        localStorage.removeItem('vdosky_sub_active');
        localStorage.removeItem('vdosky_sub_expires_at');
      }
    }

    return {
      isSubscribed: false,
      userData: null,
      expiredJustNow: false,
      daysRemaining: 0,
      expiryDate: null
    };
  }
}

/**
 * Login or Register user with Email/Mobile + 4-digit PIN
 */
export async function authenticateSubscriptionUser(
  type: 'email' | 'mobile',
  rawId: string,
  pin: string
): Promise<{ success: boolean; user?: UserSubscriptionData; notRegistered?: boolean; error?: string }> {
  const safeId = sanitizeSubscriptionId(rawId);
  let userRef = ref(subscriptionDb, `users/${safeId}`);

  try {
    let snapshot = await get(userRef);
    let resolvedSafeId = safeId;

    // Also check rawId if safeId didn't match and rawId doesn't contain forbidden chars
    if (!snapshot.exists() && !/[.#$\[\]]/.test(rawId.trim())) {
      const altRef = ref(subscriptionDb, `users/${rawId.trim()}`);
      const altSnap = await get(altRef);
      if (altSnap.exists()) {
        snapshot = altSnap;
        userRef = altRef;
        resolvedSafeId = rawId.trim();
      }
    }

    if (snapshot.exists()) {
      const user = snapshot.val() as UserSubscriptionData;

      // Check expiry upon login
      if (user.expires_at) {
        const expiryDate = new Date(user.expires_at);
        const now = new Date();
        if (now > expiryDate) {
          // Delete subkey on login if already expired
          await update(userRef, {
            subscription_status: null,
            expires_at: null,
            plan_days: null,
            purchased_at: null,
            subscription: "none"
          });
          user.subscription_status = 'expired';
          delete user.expires_at;
        }
      }

      const userPin = user.pin !== undefined ? String(user.pin) : (user.password !== undefined ? String(user.password) : '');
      if (userPin === String(pin)) {
        localStorage.setItem('sub_wallet_user', rawId);
        localStorage.setItem('sub_wallet_safe_id', resolvedSafeId);
        return { success: true, user };
      } else {
        return { success: false, notRegistered: false, error: 'Incorrect Password or PIN! Please try again.' };
      }
    } else {
      // User is NOT registered in database
      return {
        success: false,
        notRegistered: true,
        error: 'User not registered'
      };
    }
  } catch (err: any) {
    return { success: false, notRegistered: false, error: err.message || 'Authentication error' };
  }
}

export async function loginOrRegisterSubscriptionUser(
  rawId: string,
  pin: string
): Promise<{ success: boolean; user?: UserSubscriptionData; notRegistered?: boolean; error?: string }> {
  const type = rawId.includes('@') ? 'email' : 'mobile';
  return authenticateSubscriptionUser(type, rawId, pin);
}

/**
 * Handle payment from wallet balance and activate subscription
 */
export async function paySubscriptionFromWallet(
  safeId: string,
  plan: SubscriptionPlan
): Promise<{ success: boolean; error?: string; finalLink?: string; expiresAt?: string }> {
  let userRef = ref(subscriptionDb, `users/${safeId}`);

  try {
    let snapshot = await get(userRef);

    // Fallback lookup if safeId didn't match directly
    if (!snapshot.exists() && !/[.#$\[\]]/.test(safeId)) {
      const altRef = ref(subscriptionDb, `users/${safeId.trim()}`);
      const altSnap = await get(altRef);
      if (altSnap.exists()) {
        snapshot = altSnap;
        userRef = altRef;
      }
    }

    if (!snapshot.exists()) {
      return { success: false, error: 'User wallet account not found in database.' };
    }

    const userData = snapshot.val() as UserSubscriptionData;
    const currentBalance = Number(userData.balance ?? 0);

    if (currentBalance < plan.price) {
      return {
        success: false,
        error: `Insufficient wallet balance! Current balance is ₹${currentBalance.toFixed(2)}, but this plan requires ₹${plan.price}. Please recharge your wallet.`
      };
    }

    const newBalance = Number((currentBalance - plan.price).toFixed(2));
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.days);
    const expiresAtIso = expiryDate.toISOString();

    // Atomically update balance and subscription status in Firebase RTDB
    await update(userRef, {
      balance: newBalance,
      subscription_status: 'active',
      plan_days: plan.days,
      purchased_at: new Date().toISOString(),
      expires_at: expiresAtIso,
      subscription: 'active'
    });

    // Record wallet transaction history
    try {
      const txRef = push(ref(subscriptionDb, `users/${safeId}/transactions`));
      await set(txRef, {
        amount: plan.price,
        days: plan.days,
        type: 'debit',
        description: `Purchased ${plan.days} Days VIP Subscription (Ad-Free)`,
        date: new Date().toISOString()
      });
    } catch {}

    localStorage.setItem('vdosky_sub_active', '1');
    localStorage.setItem('vdosky_sub_expires_at', expiresAtIso);

    return {
      success: true,
      finalLink: plan.link,
      expiresAt: expiresAtIso
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment failed' };
  }
}

/**
 * Subscribe to balance changes in real-time
 */
export function listenToUserBalance(safeId: string, callback: (balance: number) => void): Unsubscribe {
  const balanceRef = ref(subscriptionDb, `users/${safeId}/balance`);
  return onValue(balanceRef, (snapshot) => {
    const val = snapshot.val();
    callback(Number(val || 0));
  });
}

/**
 * Logout user from subscription
 */
export function logoutSubscriptionUser() {
  localStorage.removeItem('sub_wallet_user');
  localStorage.removeItem('sub_wallet_safe_id');
  localStorage.removeItem('vdosky_sub_active');
  localStorage.removeItem('vdosky_sub_expires_at');
}
