/**
 * Strict email validation. Mirrors the practical subset enforced by most
 * servers: local@domain.tld with a 2+ character TLD and no whitespace.
 */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Username rules: 3–20 characters, letters / numbers / underscore only.
 * Mirrors the shape the sign-up screen enforces before it reaches Supabase.
 */
export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
