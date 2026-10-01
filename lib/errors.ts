import { AuthError } from '@supabase/supabase-js';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email address before signing in.',
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Password should be at least 6 characters.': 'Password must be at least 6 characters.',
  'Unable to validate email address: invalid format': 'Enter a valid email address.',
};

/** Normalize any thrown value into a user-facing message. */
export function toErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }
  return fallback;
}

/** Map a Supabase auth error to a friendly, high-trust message. */
export function authErrorMessage(error: AuthError | null | undefined): string {
  if (!error) {
    return 'Authentication failed. Please try again.';
  }
  return AUTH_ERROR_MESSAGES[error.message] ?? error.message;
}
