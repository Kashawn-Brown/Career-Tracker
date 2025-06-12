/**
 * JWT Service
 * 
 * Handles JWT token generation and verification operations.
 * Provides secure token management with proper error handling.
 */

import jwt from 'jsonwebtoken';
import { JwtPayload, TokenPair } from '../interfaces/jwt.interface.js';
import { UserRole } from '../models/user.models.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = '7d'; // Longer-lived refresh tokens

/**
 * Generate both access and refresh JWT tokens for a user
 */
export function generateTokenPair(userId: number, email: string, role: UserRole = UserRole.USER): TokenPair {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured');
  }

  const accessTokenPayload: JwtPayload = {
    userId,
    email,
    type: 'access',
    role
  };

  const refreshTokenPayload: JwtPayload = {
    userId,
    email,
    type: 'refresh',
    role
  };

  const accessToken = jwt.sign(accessTokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });

  const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256'
  });

  return {
    accessToken,
    refreshToken
  };
}

/**
 * Verify and decode an access JWT token
 */
export function verifyAccessToken(token: string): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JwtPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
}

/**
 * Verify and decode a refresh JWT token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT refresh secret not configured');
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ['HS256']
    }) as JwtPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
}

/**
 * Refresh tokens using a valid refresh token
 * Verifies the refresh token and generates a new access/refresh token pair
 */
export function refreshTokens(refreshToken: string): TokenPair {
  // Verify the refresh token
  const decoded = verifyRefreshToken(refreshToken);
  
  // Generate new token pair with role from existing token
  return generateTokenPair(decoded.userId, decoded.email, decoded.role);
} 