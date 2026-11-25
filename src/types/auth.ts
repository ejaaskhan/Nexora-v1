export type AvatarPresetId = 'violet' | 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose';

export type AuthProviderKind = 'local-demo' | 'firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string;
  role: string;
  avatarId: AvatarPresetId;
  dailyFocusGoalMinutes: number;
  isAnonymous: boolean;
  profileCompleted: boolean;
  provider: AuthProviderKind;
  createdAt: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  displayName: string;
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  displayName: string;
  role: string;
  avatarId: AvatarPresetId;
  dailyFocusGoalMinutes: number;
  profileCompleted?: boolean;
}

export interface UpgradeGuestInput {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthSuccess {
  ok: true;
  user: AuthUser;
}

export interface AuthFailure {
  ok: false;
  code:
    | 'invalid-email'
    | 'invalid-credentials'
    | 'email-already-in-use'
    | 'weak-password'
    | 'not-authenticated'
    | 'unknown';
  message: string;
}

export type AuthResult = AuthSuccess | AuthFailure;
