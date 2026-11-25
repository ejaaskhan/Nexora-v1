import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuthResult,
  AuthUser,
  ProfileUpdateInput,
  SignInCredentials,
  SignUpCredentials,
  UpgradeGuestInput,
} from '../types/auth';
import { authAdapter } from '../platform/auth';
import { storageAdapter } from '../platform/storage';

const ONBOARDING_KEY = 'nexora_onboarding_seen_v1';
const SPLASH_SESSION_KEY = 'nexora_splash_shown_session';

interface AuthContextValue {
  user: AuthUser | null;
  authReady: boolean;
  hasSeenOnboarding: boolean;
  showSplash: boolean;
  providerKind: AuthUser['provider'];

  dismissSplash: () => void;
  completeOnboarding: () => Promise<void>;
  replayOnboarding: () => Promise<void>;
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>;
  signUp: (credentials: SignUpCredentials) => Promise<AuthResult>;
  signInAsGuest: () => Promise<AuthResult>;
  upgradeGuest: (input: UpgradeGuestInput) => Promise<AuthResult>;
  updateProfile: (patch: ProfileUpdateInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return false;
      return window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [loadedUser, onboardingFlag] = await Promise.all([
          authAdapter.getCurrentUser(),
          storageAdapter.getItem(ONBOARDING_KEY),
        ]);
        if (!active) return;
        setUser(loadedUser);
        setHasSeenOnboarding(onboardingFlag === '1' || Boolean(loadedUser));
      } finally {
        if (active) setAuthReady(true);
      }
    })();

    const unsubscribe = authAdapter.subscribe((nextUser) => {
      if (active) setUser(nextUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const dismissSplash = useCallback(() => {
    setShowSplash(false);
    try {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // Ignore sessionStorage failures
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasSeenOnboarding(true);
    await storageAdapter.setItem(ONBOARDING_KEY, '1');
  }, []);

  const replayOnboarding = useCallback(async () => {
    setHasSeenOnboarding(false);
    await storageAdapter.removeItem(ONBOARDING_KEY);
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const res = await authAdapter.signInWithEmail(credentials);
    if (res.ok) {
      setHasSeenOnboarding(true);
      await storageAdapter.setItem(ONBOARDING_KEY, '1');
    }
    return res;
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    const res = await authAdapter.signUpWithEmail(credentials);
    if (res.ok) {
      setHasSeenOnboarding(true);
      await storageAdapter.setItem(ONBOARDING_KEY, '1');
    }
    return res;
  }, []);

  const signInAsGuest = useCallback(async () => {
    const res = await authAdapter.signInAsGuest();
    if (res.ok) {
      setHasSeenOnboarding(true);
      await storageAdapter.setItem(ONBOARDING_KEY, '1');
    }
    return res;
  }, []);

  const upgradeGuest = useCallback(async (input: UpgradeGuestInput) => {
    return authAdapter.upgradeGuestToAccount(input);
  }, []);

  const updateProfile = useCallback(async (patch: ProfileUpdateInput) => {
    return authAdapter.updateUserProfile(patch);
  }, []);

  const signOut = useCallback(async () => {
    await authAdapter.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        hasSeenOnboarding,
        showSplash,
        providerKind: authAdapter.providerKind,
        dismissSplash,
        completeOnboarding,
        replayOnboarding,
        signIn,
        signUp,
        signInAsGuest,
        upgradeGuest,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
