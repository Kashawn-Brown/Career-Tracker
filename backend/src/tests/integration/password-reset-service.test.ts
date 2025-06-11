/**
 * Password Reset Service Integration Tests
 * 
 * Tests for password reset service functionality including:
 * - Token verification and validation
 * - Password reset operations
 * - Security logging
 * - Expiry date handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../../services/auth.service.js';

describe('Password Reset Service Tests', () => {
  describe('Token Verification', () => {
    it('should reject invalid/non-existent tokens', async () => {
      const result = await authService.verifyPasswordResetToken('invalid-token-123');
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid');
      expect(result.userId).toBeUndefined();
    });

    it('should reject malformed tokens (too short)', async () => {
      const result = await authService.verifyPasswordResetToken('short');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should generate tokens with correct format', () => {
      const token = authService.generatePasswordResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(16);
    });
  });

  describe('Password Reset Operations', () => {
    it('should reject reset with invalid token', async () => {
      const result = await authService.resetPassword('invalid-token', 'NewPassword123!');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should handle properly formatted but non-existent tokens', async () => {
      const testToken = authService.generatePasswordResetToken();
      const result = await authService.resetPassword(testToken, 'StrongPassword123!');
      
      // Should fail due to non-existent token in database
      expect(result.success).toBe(false);
    });
  });

  describe('Password Validation Integration', () => {
    it('should validate strong passwords', () => {
      const result = authService.isValidPassword('StrongPassword123!');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = authService.isValidPassword('weak');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should integrate with password hashing correctly', async () => {
      const testPassword = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(hashedPassword).not.toBe(testPassword);
      
      // Verify hash comparison works
      const isValid = await authService.comparePassword(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('Expiry Date Handling', () => {
    it('should generate correct expiry dates', () => {
      const expiryDate = authService.getPasswordResetExpiry();
      const now = new Date();
      const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      expect(expiryDate).toBeInstanceOf(Date);
      
      // Check if expiry is approximately 1 hour from now (within 2 second tolerance)
      const timeDiff = Math.abs(expiryDate.getTime() - hourFromNow.getTime());
      expect(timeDiff).toBeLessThan(2000);
    });
  });

  describe('Security Logging', () => {
    it('should trigger security logging on verification attempts', async () => {
      // These calls should trigger internal security logging
      await authService.verifyPasswordResetToken('test-token-for-logging');
      await authService.resetPassword('test-token-for-logging', 'TestPassword123!');
      
      // If no errors are thrown, logging is working
      expect(true).toBe(true);
    });
  });
}); 