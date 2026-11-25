const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const cleaned = normalizeEmail(email);
  if (!cleaned) return 'Email address is required.';
  if (!EMAIL_REGEX.test(cleaned)) return 'Enter a valid email address (e.g., alex@domain.com).';
  return null;
}

export interface PasswordStrength {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  score: 0 | 1 | 2 | 3;
  label: 'Weak' | 'Fair' | 'Strong';
  isValid: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const minLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passed = [minLength, hasLetter, hasNumber].filter(Boolean).length as 0 | 1 | 2 | 3;

  const label: PasswordStrength['label'] =
    passed <= 1 ? 'Weak' : passed === 2 ? 'Fair' : 'Strong';

  return {
    minLength,
    hasLetter,
    hasNumber,
    score: passed,
    label,
    isValid: minLength && hasLetter && hasNumber,
  };
}

export function validatePassword(password: string, requireStrength = true): string | null {
  if (!password) return 'Password is required.';
  if (!requireStrength) return null;
  const strength = evaluatePasswordStrength(password);
  if (!strength.minLength) return 'Password must be at least 8 characters.';
  if (!strength.hasLetter || !strength.hasNumber) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Display name is required.';
  if (trimmed.length < 2) return 'Display name must be at least 2 characters.';
  if (trimmed.length > 40) return 'Display name must be 40 characters or fewer.';
  return null;
}

export function validateRole(role: string): string | null {
  const trimmed = role.trim();
  if (!trimmed) return 'Select or enter your focus role.';
  if (trimmed.length > 36) return 'Role title must be 36 characters or fewer.';
  return null;
}
