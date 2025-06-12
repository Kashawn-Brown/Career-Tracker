/**
 * JWT Interface
 * 
 * Defines TypeScript interfaces for JWT token structures.
 */

import { UserRole } from '../models/user.models.js';

/**
 * JWT Payload interface for token content
 */
export interface JwtPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
  role: UserRole;
}

/**
 * Token Pair interface for authentication responses
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
} 