import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

/**
 * Service layer
 */


// Keep token signing centralized so claims/ttl can be changed later.
function signToken(user: { id: string; email: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");

  return jwt.sign(
    { email: user.email },
    secret,
    { subject: user.id, expiresIn: "1h" }
  );
}


export async function register(email: string, password: string, name: string) {

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already in use");

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, baseResumeUrl: true, createdAt: true },  // Tells Prisma: “When you create the user, only return these fields in the response.”
  });

  // Issue and return token
  const token = signToken({ id: user.id, email: user.email });
  return { user, token };
}


export async function login(email: string, password: string) {

  const userRecord = await prisma.user.findUnique({ where: { email } });
  if (!userRecord) throw new Error("Invalid credentials");

  const ok = await bcrypt.compare(password, userRecord.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  const user = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    baseResumeUrl: userRecord.baseResumeUrl,
    createdAt: userRecord.createdAt,
  };

  // Issue and return token
  const token = signToken({ id: user.id, email: user.email });
  return { user, token };
}
