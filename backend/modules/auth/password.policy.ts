// File for password policy/strength validation

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

type PasswordChecks = {
  minLength: boolean;
  maxLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  meetsCategoryCount: boolean; // need all 4 categories
  notContainsEmail: boolean;
  notTooRepetitive: boolean;
  notAllWhitespace: boolean;
};

export type PasswordPolicyResult = {
  ok: boolean;
  checks: PasswordChecks;
  reasons: string[]; // user-facing reasons
};

function countTrue(values: boolean[]) {
  return values.reduce((acc, v) => acc + (v ? 1 : 0), 0);
}

function isTooRepetitive(password: string) {
  // blocks: aaaaaaaa, 11111111
  if (/^(.)\1+$/.test(password)) return true;

  // blocks very low variety like: abababab, 12121212, a1a1a1a1 (only 2 unique chars)
  const unique = new Set(password.split(""));
  return unique.size <= 2 && password.length >= PASSWORD_MIN_LENGTH;
}

export function evaluatePasswordPolicy(password: string, email?: string | null): PasswordPolicyResult {
  const reasons: string[] = [];

  const notAllWhitespace = password.trim().length > 0;

  const minLength = password.length >= PASSWORD_MIN_LENGTH;
  const maxLength = password.length <= PASSWORD_MAX_LENGTH;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const categoryCount = countTrue([hasLower, hasUpper, hasNumber, hasSymbol]);
  const meetsCategoryCount = categoryCount >= 4;

  let notContainsEmail = true;
  if (email) {
    const p = password.toLowerCase();
    const e = email.toLowerCase();
    const local = e.split("@")[0] ?? "";

    // Avoid false positives for super short locals like "a@b.com"
    const localOk = local.length >= 3;

    if (p.includes(e)) notContainsEmail = false;
    else if (localOk && p.includes(local)) notContainsEmail = false;
  }

  const notTooRepetitive = !isTooRepetitive(password);

  const checks: PasswordChecks = {
    minLength,
    maxLength,
    hasLower,
    hasUpper,
    hasNumber,
    hasSymbol,
    meetsCategoryCount,
    notContainsEmail,
    notTooRepetitive,
    notAllWhitespace,
  };

  if (!notAllWhitespace) reasons.push("Password cannot be empty or only spaces.");
  if (!minLength) reasons.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  if (!maxLength) reasons.push(`Password must be ${PASSWORD_MAX_LENGTH} characters or less.`);
  if (!meetsCategoryCount) reasons.push("Password must include lowercase, uppercase, number, and symbol.");
  if (!notContainsEmail) reasons.push("Password must not contain your email.");
  if (!notTooRepetitive) reasons.push("Password is too repetitive (avoid obvious patterns).");

  return { ok: reasons.length === 0, checks, reasons };
}

export function formatPasswordPolicyError(reasons: string[]) {
  // Single clean string for AppError (keeps API responses simple)
  return `Password does not meet requirements: ${reasons.join(" ")}`;
}
