/**
 * JWT Service
 * 
 * Handles JWT token generation and verification operations.
 * Provides secure token management with proper error handling.
 */

import jwt from 'jsonwebtoken';
import { JWTPayload, TokenPair } from '../models/jwt.models.js';
import { UserRole } from '../models/user.models.js';

// Return type for refreshTokens function
export interface RefreshTokenResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  tokens?: TokenPair;
}

class JwtService {
  // JWT Configuration
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
  private readonly JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
  private readonly JWT_REFRESH_EXPIRES_IN = '7d'; // Longer-lived refresh tokens

  /**
   * Generate both access and refresh JWT tokens for a user
   */
  generateTokenPair(userId: number, email: string, role: UserRole = UserRole.USER): TokenPair {
    if (!this.JWT_SECRET || !this.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets not configured');
    }

    const accessTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'access',
      role
    };

    const refreshTokenPayload: JWTPayload = {
      userId,
      email,
      type: 'refresh',
      role
    };

    const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
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
  verifyAccessToken(token: string): JWTPayload {
    if (!this.JWT_SECRET) {
      throw new Error('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

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
  verifyRefreshToken(token: string): JWTPayload {
    if (!this.JWT_REFRESH_SECRET) {
      throw new Error('JWT refresh secret not configured');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

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
   * Validates input, verifies the refresh token, and generates a new access/refresh token pair
   * 
   * Sliding refresh token system:
   *  - returns both a new access token AND a new refresh token pair
   *  - effectively "refreshing the refresh token" and extending the user's session
   *  - similar to Youtube's refresh token system (never seem to get logged out)
   */
  refreshTokens(refreshToken: string): RefreshTokenResult {
    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      return {
        success: false,
        statusCode: 400,
        error: 'Invalid refresh token format'
      };
    }

    try {
      // Verify the refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Generate new token pair with role from existing token
      const tokens = this.generateTokenPair(decoded.userId, decoded.email, decoded.role);

      return {
        success: true,
        statusCode: 200,
        message: 'Tokens refreshed successfully',
        tokens
      };
    } catch (error) {
      if (error instanceof Error && (error.message.includes('expired'))) {
        return {
          success: false,
          statusCode: 401,
          error: 'Refresh token has expired'
        };
      } else if (error instanceof Error && error.message.includes('Invalid')) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid refresh token'
        };
      } else {
        return {
          success: false,
          statusCode: 500,
          error: 'Internal server error during token refresh'
        };
      }
    }
  }
}

// Export a single instance of the service
export const jwtService = new JwtService(); 