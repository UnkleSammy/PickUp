/**
 * Strict email validation. Mirrors the practical subset enforced by most
 * servers: local@domain.tld with a 2+ character TLD and no whitespace.
 */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidUsername(username: string): boolean {
  return username.trim().length >= 3;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
