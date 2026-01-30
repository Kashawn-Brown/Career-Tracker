import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { generateToken } from "../../lib/crypto.js";
import { authUserSelect } from "../auth/auth.dto.js";
import * as AuthService from "../auth/auth.service.js";
import type { GoogleUserInfo } from "./oauth.google.js";

/**
 * Google OAuth login/link:
 * - If provider identity already linked -> return that user
 * - Else link by email if user exists
 * - Else create a new user (password random) and mark emailVerifiedAt
 */
export async function loginWithGoogle(profile: GoogleUserInfo) {
  if (!profile.email) throw new AppError("Google account did not return an email.", 400);
  if (!profile.email_verified) throw new AppError("Google email is not verified.", 400);

  const existingOauth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "GOOGLE",
        providerAccountId: profile.sub,
      },
    },
    include: {
      user: { select: { id: true, emailVerifiedAt: true, isActive: true } },
    },
  });

  // The user already exists and is using oAuth to login.
  if (existingOauth?.user) {
    const updates: { emailVerifiedAt?: Date; isActive?: boolean } = {};

    if (!existingOauth.user.emailVerifiedAt) updates.emailVerifiedAt = new Date();
    if (!existingOauth.user.isActive) updates.isActive = true;

    if (Object.keys(updates).length) {
      await prisma.user.update({
        where: { id: existingOauth.user.id },
        data: updates,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: existingOauth.user.id },
      select: authUserSelect,
    });
    if (!user) throw new AppError("OAuth user not found", 500);

    return user;
  }


  // Check if the user exists by email. (but not currently using oAuth to login)
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
    select: authUserSelect,
  });

  // The user does not exist, so create a new user
  if (!user) {
    // Password is required by schema; OAuth users won't use it unless they reset password later.
    const randomPassword = generateToken(32);
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        passwordHash,
        emailVerifiedAt: new Date(),
      },
      select: authUserSelect,
    });
  } 
  
  // The user exists but is not verified, so we need to verify them.
  if (!user.emailVerifiedAt) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
      select: authUserSelect,
    });
  }

  // Reactivate account on successful Google sign-in (only writes if currently deactivated)
  await prisma.user.updateMany({
    where: { id: user.id, isActive: false },
    data: { isActive: true },
  });
  
  
  // Link the oAuth account to the user.
  await prisma.oAuthAccount.create({
    data: {
      userId: user.id,
      provider: "GOOGLE",
      providerAccountId: profile.sub,
    },
  });

  return user;
}

export async function createSessionForUser(userId: string) {
  // Reuse existing session creation logic (refresh token rotation etc.)
  return AuthService.createAuthSession(userId);
}
