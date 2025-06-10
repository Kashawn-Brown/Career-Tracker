/**
 * Authentication Middleware
 * 
 * Basic middleware functions for route protection and user context.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { JWTPayload } from '../models/auth.models.js';

// Extend FastifyRequest to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

const authService = new AuthService();

/**
 * Middleware: Require authentication via JWT token
 * Extracts and verifies JWT token, adds user info to request
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No authorization header provided',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Invalid authorization format',
        message: 'Authorization header must start with "Bearer "',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    if (!token) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No token provided',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // Verify the JWT token
    const payload = authService.verifyAccessToken(token);
    
    // Add user information to request object
    request.user = payload;
    
  } catch (error) {
    // Handle different types of JWT errors
    let message = 'Invalid token';
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        message = 'Token has expired';
      } else if (error.message === 'Invalid token') {
        message = 'Invalid or malformed token';
      } else if (error.message === 'Invalid token type') {
        message = 'Wrong token type (refresh token used where access token expected)';
      }
    }
    
    return reply.status(401).send({
      error: 'Authentication failed',
      message,
      statusCode: 401,
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
}

/**
 * Middleware: Extract user context (optional authentication)
 * 
 * Tries to extract user info from JWT token if present, but doesn't fail if missing.
 * This middleware is useful for routes that behave differently for authenticated vs anonymous users.
 * 
 * Use cases:
 * - Public routes that show personalized content when user is logged in
 * - Routes that display different data/options based on authentication status  
 * - Public job boards that show "applied" status for authenticated users
 * - Content that's available to everyone but shows extra features when authenticated
 * 
 * After this middleware runs:
 * - request.user will contain JWTPayload if valid token was provided
 * - request.user will be undefined if no token or invalid token
 * - The request always continues (never blocks/returns 401)
 */
export async function extractUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    
    // If no auth header, just continue without user context
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    // If no token, just continue
    if (!token) {
      return;
    }

    // Try to verify the JWT token
    const payload = authService.verifyAccessToken(token);
    
    // Add user information to request object
    request.user = payload;
    
  } catch (error) {
    // If token verification fails, just continue without user context
    // This is optional authentication - we don't want to block the request
    // The request.user will remain undefined
  }
}

/**
 * Middleware factory: Role-based access control
 * 
 * Creates middleware that checks if the authenticated user has one of the required roles.
 * This middleware MUST be used after requireAuth middleware to ensure request.user exists.
 * 
 * @param allowedRoles Array of role names that are allowed to access the route
 * @returns Middleware function that checks user role
 * 
 * Usage:
 * - roleBasedAccess(['ADMIN']) - Admin only
 * - roleBasedAccess(['ADMIN', 'MODERATOR']) - Admin or Moderator
 * - roleBasedAccess(['PREMIUM', 'ADMIN']) - Premium users or Admin
 */
export function roleBasedAccess(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Ensure user is authenticated (should be set by requireAuth middleware)
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No user context found. Ensure requireAuth middleware runs before roleBasedAccess.',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Access forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${request.user.role}`,
        statusCode: 403,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }

    // User has the required role, continue to the route handler
  };
} 