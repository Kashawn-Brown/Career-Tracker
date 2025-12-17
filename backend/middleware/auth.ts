import type { FastifyRequest, FastifyReply } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Gatekeeper function that turns an incoming HTTP request into an authenticated request
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

  try {
    
    // Verify token (signature + expiry)
    const payload = jwt.verify(token, secret) as JwtPayload

    // Extract user info
    const userId = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : undefined;

    if (!userId || !email) {
      reply.status(401).send({ message: "Invalid token payload" });
      return;
    }
    
    // Attach “current user” to the request for later routes to use easily w req.user.id
    req.user = { id: userId, email };
    return;

  } catch {
    return reply.status(401).send({ message: "Invalid or expired token" });
  }
}
