import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { generateToken, hashToken } from "../../lib/crypto.js";
import { authUserSelect, authLoginSelect, CreateAuthSessionOptions, SessionTokens } from "./auth.dto.js";
import { evaluatePasswordPolicy, formatPasswordPolicyError } from "./password.policy.js";
import { sendEmail } from "../../lib/email.js";


/**
 * Service layer
 */

// ---------------- REGISTRATION & LOGIN ----------------

/**
 * Allow a user to register.
 */
export async function register(email: string, password: string, name: string) {

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already in use", 409);

  // Make sure the password meets the password policy
  const passwordPolicy = evaluatePasswordPolicy(password, email);
  if (!passwordPolicy.ok) throw new AppError(formatPasswordPolicyError(passwordPolicy.reasons), 400);

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: authUserSelect,
  });

  // Email verification: create token + send email
  try {
    const { token: verifyToken } = await issueEmailVerificationToken(user.id);
    const url = buildVerifyEmailUrl(verifyToken);

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: verifyEmailHtml(url),
      kind: "verify_email",
      userId: user.id,
    });
  } catch (err: any) {
    // Do not block registration if email fails; logs will show [email.send]
    console.warn("[auth] verify email send failed", err?.message ?? err);
  }
  

  // Create refresh session (raw tokens returned only to route for cookie-setting)
  const session = await createAuthSession(user.id);
  const { refreshToken, csrfToken, expiresAt } = session;

  // Issue and return access token
  const token = signToken({ id: user.id, email: user.email });

  // Return the user, access token, refresh token, and csrf token
  return { user, token, refreshToken, csrfToken, expiresAt};
}


/**
 * Allow a user to login.
 */
export async function login(email: string, password: string) {

  const userRecord = await prisma.user.findUnique({ where: { email }, select: authLoginSelect });
  if (!userRecord) throw new AppError("Invalid credentials", 401);

  const ok = await bcrypt.compare(password, userRecord.passwordHash);
  if (!ok) throw new AppError("Invalid credentials", 401);

  // Remove passwordHash from the user object
  const { passwordHash: _passwordHash, ...user } = userRecord;

  // Create refresh session (raw tokens returned only to route for cookie-setting)
  const session = await createAuthSession(user.id);
  const { refreshToken, csrfToken, expiresAt } = session;

  // Issue and return access token
  const token = signToken({ id: user.id, email: user.email });

  return { user, token, refreshToken, csrfToken, expiresAt };
}



/**
 * Centralizing token signing.
 */
function signToken(user: { id: string; email: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  return jwt.sign(
    { email: user.email },
    secret,
    { subject: user.id, expiresIn: "1h" }
  );
}


// ---------------- SESSIONS/REFRESH TOKENS ----------------

const DEFAULT_REFRESH_DAYS = 30;

/**
 * Create a new authentication session for a user.
 * 
 * This is used to create a new authentication session for a user.
 */
export async function createAuthSession(
  userId: string,
  opts?: CreateAuthSessionOptions
): Promise<SessionTokens> {
  
  // Generate the refresh and csrf tokens
  const refreshToken = generateToken(48);
  const csrfToken = generateToken(32);
  const days = opts?.expiresInDays ?? DEFAULT_REFRESH_DAYS;

  // Calculate the expiration date of the session
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt,
    },
  });

  return { refreshToken, csrfToken, expiresAt };
}

/**
 * Get an active authentication session by refresh token.
 * 
 * This is used to validate the refresh token when a user logs in.
 */
export async function getActiveSessionByRefreshToken(refreshToken: string) {
  const session = await prisma.authSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
  });

  // If the session is not found, revoked or expired, return null
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session;
}

const CSRF_BYTES = 32;
const REFRESH_BYTES = 48;

function now() {
  return new Date();
}

/**
 * Bootstrap the CSRF token for a user.
 * 
 * - verifies refresh cookie session
 * - rotates CSRF token (because we only store hashes and can't "read" the old token back)
 */
export async function bootstrapCsrf(refreshToken: string): Promise<{ csrfToken: string | null }> {
  const session = await getActiveSessionByRefreshToken(refreshToken);
  if (!session) return { csrfToken: null };

  const csrfToken = generateToken(CSRF_BYTES);

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      csrfTokenHash: hashToken(csrfToken),
      lastUsedAt: now(),
    },
  });

  return { csrfToken };
}

/**
 * Refresh a user's authentication session.
 * 
 * - validates refresh cookie + csrf header
 * - rotates refresh token + csrf token
 * - returns new access token + new csrf token (refresh token only returned to route to set cookie)
 */
export async function refreshSession(refreshToken: string, csrfToken: string) {
  const session = await getActiveSessionByRefreshToken(refreshToken);
  if (!session) throw new AppError("Invalid session", 401);

  const csrfHash = hashToken(csrfToken);
  if (csrfHash !== session.csrfTokenHash) throw new AppError("Invalid CSRF token", 403);

  const newRefreshToken = generateToken(REFRESH_BYTES);
  const newCsrfToken = generateToken(CSRF_BYTES);

  // Pull user email for access-token signing
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true },
  });
  if (!user) throw new AppError("Invalid session", 401);

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(newRefreshToken),
      csrfTokenHash: hashToken(newCsrfToken),
      lastUsedAt: now(),
    },
  });

  const token = signToken({ id: user.id, email: user.email });

  return {
    token,
    refreshToken: newRefreshToken,
    csrfToken: newCsrfToken,
    expiresAt: session.expiresAt,
  };
}

/**
 * Log out a user's authentication session.
 * 
 * - validates refresh cookie + csrf header
 * - revokes session
 */
export async function logoutSession(refreshToken: string, csrfToken: string): Promise<void> {
  const session = await getActiveSessionByRefreshToken(refreshToken);
  if (!session) return; // logout should be idempotent

  const csrfHash = hashToken(csrfToken);
  if (csrfHash !== session.csrfTokenHash) throw new AppError("Invalid CSRF token", 403);

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      revokedAt: now(),
      lastUsedAt: now(),
    },
  });
}


// ---------------- EMAIL VERIFICATION ----------------

// Constants for email verification
const VERIFY_TOKEN_BYTES = 32;
const VERIFY_TOKEN_TTL_HOURS = 24;

function getFrontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

function buildVerifyEmailUrl(token: string): string {
  return `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

// Email verification HTML template
function verifyEmailHtml(url: string): string {
  return `
    <p>Verify your email for Career-Tracker:</p>
    <p><a href="${url}">Verify email</a></p>
    <p>If you didn’t create this account, you can ignore this email.</p>
  `.trim();
}

/**
 * Issue a new email verification token for a user.
 */
async function issueEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  
  // Generate the email verification token
  const token = generateToken(VERIFY_TOKEN_BYTES);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  // Invalidate any previous active tokens for this user
  await prisma.$transaction(async (db) => {
    await db.emailVerificationToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now() },
    });

    // Add the new email verification token to the database
    await db.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });

  return { token, expiresAt };
}

/**
 * Verify email token and mark user as verified
 */
export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  await prisma.$transaction(async (db) => {

    // Find the email verification token
    const tokenRecord = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, consumedAt: true },
    });

    // If the token is not found, expired, or already consumed, throw an error
    if (!tokenRecord) throw new AppError("Invalid or expired token", 400);
    if (tokenRecord.consumedAt) throw new AppError("Invalid or expired token", 400);
    if (tokenRecord.expiresAt.getTime() <= Date.now()) throw new AppError("Invalid or expired token", 400);

    // Consume token (mark as used) to prevent reuse
    await db.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { consumedAt: now() },
    });

    // Mark user as verified
    await db.user.updateMany({
      where: { id: tokenRecord.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now() },
    });
  });
}

/**
 * Resend a verification email to a user.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  // Do nothing if missing or already verified
  if (!user) return;
  if (user.emailVerifiedAt) return;

  try {
    const { token: verifyToken } = await issueEmailVerificationToken(user.id);
    const url = buildVerifyEmailUrl(verifyToken);

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: verifyEmailHtml(url),
      kind: "verify_email",
      userId: user.id,
    });
  } catch (err: any) {
    // Non-enumerating: swallow and rely on logs
    console.warn("[auth] resend verification failed", err?.message ?? err);
  }
}
