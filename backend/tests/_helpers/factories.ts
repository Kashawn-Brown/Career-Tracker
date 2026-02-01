import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

type CreateUserArgs = {
  email: string;
  password: string;
  name?: string;
  isActive?: boolean;
  emailVerifiedAt?: Date | null;
};

export function uniqueEmail() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

/**
 * Creates a user directly in the DB (bypasses /register).
 * Use this when you need a specific user state (ex: isActive=false).
 */
export async function createUser(args: CreateUserArgs) {
  const passwordHash = await bcrypt.hash(args.password, 12);

  return prisma.user.create({
    data: {
      email: args.email,
      name: args.name ?? "Test User",
      passwordHash,
      isActive: args.isActive ?? true,
      emailVerifiedAt: typeof args.emailVerifiedAt === "undefined" ? null : args.emailVerifiedAt,
    },
    select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
  });
}

/**
 * Creates a verified user and signs an access token.
 */
export async function createVerifiedUser(email: string, password: string) {
  const user = await createUser({ email, password, emailVerifiedAt: new Date() });
  const token = signAccessToken(user);
  return { user, token };
}

/**
 * Signs an access token exactly like AuthService.signToken():
 * jwt.sign({ email }, JWT_SECRET, { subject: userId, expiresIn: "1h" })
 */
export function signAccessToken(user: { id: string; email: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in test env");

  return jwt.sign({ email: user.email }, secret, {
    subject: user.id,
    expiresIn: "1h",
  });
}
