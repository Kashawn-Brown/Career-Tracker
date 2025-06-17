/**
 * JWT Models
 * 
 * Defines TypeScript interfaces and types for JWT-related entities.
 * These models represent the structure of JWT data used throughout the application.
 */

import { UserRole } from './user.models.js';

/**
 * JWT payload structure for access and refresh tokens
 */
export interface JWTPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Token pair containing both access and refresh tokens
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * JWT configuration options
 */
export interface JWTConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
} 