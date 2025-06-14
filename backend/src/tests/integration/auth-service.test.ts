/**
 * AuthService Integration Tests
 * 
 * Tests for core authentication service functionality including:
 * - Password hashing and comparison
 * - JWT token generation and verification
 * - Email verification tokens
 * - Email and password validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../../services/auth.service.js';
import { jwtService } from '../../services/jwt.service.js';

describe('AuthService Integration Tests', () => {
  const testPassword = 'MySecurePass123!';
  let hashedPassword: string;

  describe('Password Management', () => {
    it('should hash password successfully', async () => {
      hashedPassword = await authService.hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(hashedPassword).not.toBe(testPassword);
    });

    it('should verify correct password', async () => {
      const isValid = await authService.comparePassword(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await authService.comparePassword('WrongPassword123!', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should validate strong passwords', () => {
      const result = authService.isValidPassword('MySecurePass123!');
      expect(result.valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result = authService.isValidPassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Token Management', () => {
    it('should generate token pair when secrets are available', () => {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        expect(true).toBe(true); // Skip if no secrets
        return;
      }

      const tokenPair = jwtService.generateTokenPair(1, 'test@example.com');
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(typeof tokenPair.accessToken).toBe('string');
      expect(typeof tokenPair.refreshToken).toBe('string');
    });

    it('should verify access token when secrets are available', () => {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        expect(true).toBe(true); // Skip if no secrets
        return;
      }

      const tokenPair = jwtService.generateTokenPair(1, 'test@example.com');
      const decoded = jwtService.verifyAccessToken(tokenPair.accessToken);
      
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    it('should verify refresh token when secrets are available', () => {
      if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
        expect(true).toBe(true); // Skip if no secrets
        return;
      }

      const tokenPair = jwtService.generateTokenPair(1, 'test@example.com');
      const decoded = jwtService.verifyRefreshToken(tokenPair.refreshToken);
      
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Email Verification', () => {
    it('should generate email verification token', () => {
      const token = authService.generateToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should validate email addresses', () => {
      expect(authService.isValidEmail('test@example.com')).toBe(true);
      expect(authService.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(authService.isValidEmail('invalid-email')).toBe(false);
      expect(authService.isValidEmail('test@')).toBe(false);
      expect(authService.isValidEmail('@domain.com')).toBe(false);
    });
  });
}); 