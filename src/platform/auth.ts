import {
  AuthProviderKind,
  AuthResult,
  AuthUser,
  ProfileUpdateInput,
  SignInCredentials,
  SignUpCredentials,
  UpgradeGuestInput,
} from '../types/auth';
import { storageAdapter } from './storage';
import { generateId } from '../utils/date';
import { normalizeEmail, validateEmail, validatePassword } from '../utils/validation';

/**
 * Firebase-ready Authentication Adapter Contract.
 *
 * All UI views (Auth, Profile Setup, Settings, AppShell) consume AuthContext,
 * which delegates exclusively to this interface. To migrate to Firebase Authentication:
 *   1. Implement FirebaseAuthAdapter using firebase/auth
 *      (signInWithEmailAndPassword, createUserWithEmailAndPassword,
 *       signInAnonymously, linkWithCredential, updateProfile, signOut, onAuthStateChanged).
 *   2. Swap the exported `authAdapter` instance below.
 */
export interface AuthAdapter {
  readonly providerKind: AuthProviderKind;
  getCurrentUser(): Promise<AuthUser | null>;
  signInWithEmail(credentials: SignInCredentials): Promise<AuthResult>;
  signUpWithEmail(credentials: SignUpCredentials): Promise<AuthResult>;
  signInAsGuest(): Promise<AuthResult>;
  upgradeGuestToAccount(input: UpgradeGuestInput): Promise<AuthResult>;
  updateUserProfile(patch: ProfileUpdateInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}

interface StoredDemoAccount {
  user: AuthUser;
  passwordDigest: string;
}

const ACCOUNTS_KEY = 'nexora_demo_accounts_v1';
const SESSION_KEY = 'nexora_demo_session_v1';

export const DEMO_ACCOUNT_CREDENTIALS = {
  email: 'demo@nexora.app',
  password: 'Nexora2026',
} as const;

// Deterministic non-plaintext local encoding strictly for demo-mode validation.
function digestLocalDemoPassword(email: string, password: string): string {
  const input = `${normalizeEmail(email)}::${password}::nexora_local_v1`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `demo_${(hash >>> 0).toString(16)}`;
}

function createDefaultDemoAccount(): StoredDemoAccount {
  const email = DEMO_ACCOUNT_CREDENTIALS.email;
  return {
    user: {
      uid: 'uid_nexora_demo_founder',
      email,
      displayName: 'Alex Mercer',
      role: 'Product Engineer',
      avatarId: 'cyan',
      dailyFocusGoalMinutes: 180,
      isAnonymous: false,
      profileCompleted: true,
      provider: 'local-demo',
      createdAt: '2026-01-15T09:00:00.000Z',
    },
    passwordDigest: digestLocalDemoPassword(email, DEMO_ACCOUNT_CREDENTIALS.password),
  };
}

class LocalDemoAuthAdapter implements AuthAdapter {
  readonly providerKind: AuthProviderKind = 'local-demo';
  private listeners = new Set<(user: AuthUser | null) => void>();

  private notify(user: AuthUser | null): void {
    this.listeners.forEach((cb) => cb(user));
  }

  private async loadAccounts(): Promise<StoredDemoAccount[]> {
    const raw = await storageAdapter.getItem(ACCOUNTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredDemoAccount[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through to default account seed
      }
    }
    const seeded = [createDefaultDemoAccount()];
    await storageAdapter.setItem(ACCOUNTS_KEY, JSON.stringify(seeded));
    return seeded;
  }

  private async saveAccounts(accounts: StoredDemoAccount[]): Promise<void> {
    await storageAdapter.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  private async saveSession(user: AuthUser | null): Promise<void> {
    if (user) {
      await storageAdapter.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      await storageAdapter.removeItem(SESSION_KEY);
    }
    this.notify(user);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    // Ensure default demo account exists for quick testing
    await this.loadAccounts();
    const raw = await storageAdapter.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && typeof parsed.uid === 'string') {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  async signInWithEmail(credentials: SignInCredentials): Promise<AuthResult> {
    const emailError = validateEmail(credentials.email);
    if (emailError) {
      return { ok: false, code: 'invalid-email', message: emailError };
    }
    if (!credentials.password) {
      return { ok: false, code: 'invalid-credentials', message: 'Password is required.' };
    }

    const email = normalizeEmail(credentials.email);
    const accounts = await this.loadAccounts();
    const match = accounts.find((acc) => acc.user.email === email);

    if (!match) {
      return {
        ok: false,
        code: 'invalid-credentials',
        message: 'No account found for this email. Create an account or use Demo Credentials.',
      };
    }

    const digest = digestLocalDemoPassword(email, credentials.password);
    if (match.passwordDigest !== digest) {
      return {
        ok: false,
        code: 'invalid-credentials',
        message: 'Incorrect password. Check your credentials and try again.',
      };
    }

    await this.saveSession(match.user);
    return { ok: true, user: match.user };
  }

  async signUpWithEmail(credentials: SignUpCredentials): Promise<AuthResult> {
    const emailError = validateEmail(credentials.email);
    if (emailError) {
      return { ok: false, code: 'invalid-email', message: emailError };
    }
    const passwordError = validatePassword(credentials.password, true);
    if (passwordError) {
      return { ok: false, code: 'weak-password', message: passwordError };
    }

    const email = normalizeEmail(credentials.email);
    const accounts = await this.loadAccounts();
    if (accounts.some((acc) => acc.user.email === email)) {
      return {
        ok: false,
        code: 'email-already-in-use',
        message: 'An account with this email already exists. Try signing in instead.',
      };
    }

    const newUser: AuthUser = {
      uid: generateId('uid'),
      email,
      displayName: credentials.displayName.trim() || email.split('@')[0],
      role: 'Builder',
      avatarId: 'violet',
      dailyFocusGoalMinutes: 180,
      isAnonymous: false,
      profileCompleted: false,
      provider: 'local-demo',
      createdAt: new Date().toISOString(),
    };

    const nextAccounts: StoredDemoAccount[] = [
      ...accounts,
      {
        user: newUser,
        passwordDigest: digestLocalDemoPassword(email, credentials.password),
      },
    ];
    await this.saveAccounts(nextAccounts);
    await this.saveSession(newUser);
    return { ok: true, user: newUser };
  }

  async signInAsGuest(): Promise<AuthResult> {
    const guestUser: AuthUser = {
      uid: generateId('guest'),
      email: null,
      displayName: 'Guest Explorer',
      role: 'Demo Workspace',
      avatarId: 'indigo',
      dailyFocusGoalMinutes: 180,
      isAnonymous: true,
      profileCompleted: true,
      provider: 'local-demo',
      createdAt: new Date().toISOString(),
    };

    await this.saveSession(guestUser);
    return { ok: true, user: guestUser };
  }

  async upgradeGuestToAccount(input: UpgradeGuestInput): Promise<AuthResult> {
    const current = await this.getCurrentUser();
    if (!current) {
      return { ok: false, code: 'not-authenticated', message: 'No active guest session found.' };
    }

    const emailError = validateEmail(input.email);
    if (emailError) {
      return { ok: false, code: 'invalid-email', message: emailError };
    }
    const passwordError = validatePassword(input.password, true);
    if (passwordError) {
      return { ok: false, code: 'weak-password', message: passwordError };
    }

    const email = normalizeEmail(input.email);
    const accounts = await this.loadAccounts();
    if (accounts.some((acc) => acc.user.email === email)) {
      return {
        ok: false,
        code: 'email-already-in-use',
        message: 'This email is already registered. Choose a different email or sign in.',
      };
    }

    const upgradedUser: AuthUser = {
      ...current,
      email,
      displayName: input.displayName.trim() || current.displayName,
      role: current.role === 'Demo Workspace' ? 'Creator' : current.role,
      isAnonymous: false,
      profileCompleted: true,
    };

    const nextAccounts: StoredDemoAccount[] = [
      ...accounts,
      {
        user: upgradedUser,
        passwordDigest: digestLocalDemoPassword(email, input.password),
      },
    ];

    await this.saveAccounts(nextAccounts);
    await this.saveSession(upgradedUser);
    return { ok: true, user: upgradedUser };
  }

  async updateUserProfile(patch: ProfileUpdateInput): Promise<AuthResult> {
    const current = await this.getCurrentUser();
    if (!current) {
      return { ok: false, code: 'not-authenticated', message: 'Sign in to update your profile.' };
    }

    const updated: AuthUser = {
      ...current,
      displayName: patch.displayName.trim() || current.displayName,
      role: patch.role.trim() || current.role,
      avatarId: patch.avatarId,
      dailyFocusGoalMinutes: Math.max(30, Math.min(720, Math.round(patch.dailyFocusGoalMinutes))),
      profileCompleted: patch.profileCompleted ?? true,
    };

    if (!updated.isAnonymous && updated.email) {
      const accounts = await this.loadAccounts();
      const nextAccounts = accounts.map((acc) =>
        acc.user.uid === updated.uid ? { ...acc, user: updated } : acc
      );
      await this.saveAccounts(nextAccounts);
    }

    await this.saveSession(updated);
    return { ok: true, user: updated };
  }

  async signOut(): Promise<void> {
    await this.saveSession(null);
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const authAdapter: AuthAdapter = new LocalDemoAuthAdapter();
