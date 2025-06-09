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
        message: 'No authorization header provided'
      });
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Invalid authorization format',
        message: 'Authorization header must start with "Bearer "'
      });
    }

    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    if (!token) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No token provided'
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
      message
    });
  }
}

/**
 * Middleware: Extract user context (placeholder)
 * TODO: Add user extraction logic
 */
export async function extractUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Placeholder - will implement user context extraction
  console.log('extractUser middleware called');
  // For now, just continue
}

/**
 * Middleware factory: Role-based access control (placeholder)
 * TODO: Add role checking logic
 */
export function roleBasedAccess(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Placeholder - will implement role checking
    console.log(`roleBasedAccess middleware called for roles: ${allowedRoles.join(', ')}`);
    // For now, just continue
  };
} 