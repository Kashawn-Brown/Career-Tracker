import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { generateToken, hashToken } from "../../lib/crypto.js";
import { authUserSelect, authLoginSelect, CreateAuthSessionOptions, SessionTokens } from "./auth.dto.js";

/**
 * Service layer
 */


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

/**
 * Refresh session helpers.
 *
 * Not wired into routes yet — safe to add without changing behavior.
 */

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


/**
 * Allow a user to register.
 */
export async function register(email: string, password: string, name: string) {

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already in use", 409);

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: authUserSelect,
  });

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
