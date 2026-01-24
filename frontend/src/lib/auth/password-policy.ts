// File for password policy/strength validation
// Mirrors backend password rules.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordChecks = {
  minLength: boolean;
  maxLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  notContainsEmail: boolean;
  notTooRepetitive: boolean;
  notAllWhitespace: boolean;
};

export type PasswordEval = {
  ok: boolean;
  checks: PasswordChecks;
  strengthLabel: "Too short" | "Weak" | "Okay" | "Good" | "Strong";
};

function isTooRepetitive(password: string) {
  if (/^(.)\1+$/.test(password)) return true;

  const unique = new Set(password.split(""));
  return unique.size <= 2 && password.length >= PASSWORD_MIN_LENGTH;
}

export function evaluatePassword(password: string, email?: string): PasswordEval {
  const notAllWhitespace = password.trim().length > 0;

  const minLength = password.length >= PASSWORD_MIN_LENGTH;
  const maxLength = password.length <= PASSWORD_MAX_LENGTH;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let notContainsEmail = true;
  if (email) {
    const p = password.toLowerCase();
    const e = email.trim().toLowerCase();
    const local = e.split("@")[0] ?? "";
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
    notContainsEmail,
    notTooRepetitive,
    notAllWhitespace,
  };

  const lengthOk = notAllWhitespace && minLength && maxLength;
  const categoryCount = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0);

  const strengthLabel: PasswordEval["strengthLabel"] = 
    !lengthOk ? "Too short" :
    categoryCount >= 4 ? "Strong" :
    categoryCount === 3 ? "Good" :
    categoryCount === 2 ? "Okay" :
    "Weak";

    const ok =
    notAllWhitespace &&
    minLength &&
    maxLength &&
    hasLower &&
    hasUpper &&
    hasNumber &&
    hasSymbol &&
    notContainsEmail &&
    notTooRepetitive;

  return { ok, checks, strengthLabel };
}
