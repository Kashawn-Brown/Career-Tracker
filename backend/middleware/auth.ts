import type { FastifyRequest, FastifyReply } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../errors/app-error.js";

/**
 * Gatekeeper function that turns an incoming HTTP request into an authenticated request
 * 
 * - Verifies the Bearer access token and hydrates req.user
 * - Also blocks deactivated accounts immediately (DB check).
 */ 
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
    
  const auth = req.headers.authorization;

  // Require standard Bearer token fromat (Missing/Wrong format) -? 401
  if (!auth || !auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ message: "Missing Bearer token" });
  }

  // Extract token
  const token = auth.slice("Bearer ".length);

  const secret = process.env.JWT_SECRET;

  // Server misconfigured -> 500
  if (!secret) return reply.status(500).send({ message: "Server misconfigured" });

  let payload: JwtPayload;

  try {
    // Verify token (signature + expiry)
    payload = jwt.verify(token, secret) as JwtPayload;
  
  } catch {
    throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  }

  // Extract user info
  const userId = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : undefined;

  if (!userId || !email) {
    throw new AppError("Invalid token payload", 401, "UNAUTHORIZED");
  }

  
  // DB check: user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true },
  });

  if (!user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  if (!user.isActive) {
    throw new AppError("Account deactivated", 403, "ACCOUNT_DEACTIVATED");
  }

  // Attach “current user” for routes/services
  req.user = { id: userId, email };
  
}
