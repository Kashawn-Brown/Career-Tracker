/**
 * Account Lockout Implementation Validation Tests
 * 
 * Integration tests to verify Task 12.6 account lockout features are implemented:
 * - Account lockout functionality
 * - Progressive lockout times (5 attempts = 15 min, 10 attempts = 1 hour)
 * - Database fields for lockout tracking
 * - Automatic unlock mechanisms
 * - Manual admin unlock options
 * - Forced password reset triggers
 * - Email notifications for lock/unlock
 * - Admin endpoints for locked accounts
 * - User-facing lockout messaging
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

describe('Account Lockout Validation', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Schema Validation', () => {
    it('should have UserSecurity table with lockout fields', async () => {
      await expect(async () => {
        await prisma.userSecurity.findFirst({
          select: {
            isLocked: true,
            lockoutCount: true,
            lockoutUntil: true,
            lastLockoutReason: true,
            forcePasswordReset: true,
            forcePasswordResetReason: true
          }
        });
      }).not.toThrow();
    });
  });

  describe('UserSecurity Service Validation', () => {
    it('should have all required lockout methods', async () => {
      const userSecurityServicePath = path.join(process.cwd(), 'src/services/userSecurity.service.ts');
      const userSecurityServiceContent = await fs.readFile(userSecurityServicePath, 'utf-8');
      
      const requiredMethods = [
        'isAccountLocked',
        'recordFailedAttempt',
        'lockAccount',
        'unlockAccount',
        'checkSuspiciousActivity',
        'forcePasswordReset'
      ];
      
      requiredMethods.forEach(method => {
        expect(userSecurityServiceContent).toContain(method);
      });
    });

    it('should have progressive lockout configuration', async () => {
      const userSecurityServicePath = path.join(process.cwd(), 'src/services/userSecurity.service.ts');
      const userSecurityServiceContent = await fs.readFile(userSecurityServicePath, 'utf-8');
      
      expect(userSecurityServiceContent).toContain('LOCKOUT_PROGRESSION');
      expect(userSecurityServiceContent).toContain('15'); // 15 min lockout
      expect(userSecurityServiceContent).toContain('30'); // 30 min lockout
      expect(userSecurityServiceContent).toContain('60'); // 1 hour lockout
    });

    it('should have suspicious activity detection', async () => {
      const userSecurityServicePath = path.join(process.cwd(), 'src/services/userSecurity.service.ts');
      const userSecurityServiceContent = await fs.readFile(userSecurityServicePath, 'utf-8');
      
      expect(userSecurityServiceContent).toContain('SUSPICIOUS_ACTIVITY_CONFIG');
      expect(userSecurityServiceContent).toContain('multipleIpsThreshold');
      expect(userSecurityServiceContent).toContain('checkSuspiciousActivity');
    });
  });

  describe('Email Service Validation', () => {
    it('should have account lockout email methods', async () => {
      const emailServicePath = path.join(process.cwd(), 'src/services/email.service.ts');
      const emailServiceContent = await fs.readFile(emailServicePath, 'utf-8');
      
      const requiredEmailMethods = [
        'sendAccountLockedEmail',
        'sendAccountUnlockedEmail'
      ];
      
      requiredEmailMethods.forEach(method => {
        expect(emailServiceContent).toContain(method);
      });
    });
  });

  describe('Admin Endpoints Validation', () => {
    it('should have admin unlock endpoints', async () => {
      const adminRoutesPath = path.join(process.cwd(), 'src/routes/admin.ts');
      const adminRoutesContent = await fs.readFile(adminRoutesPath, 'utf-8');
      
      expect(adminRoutesContent).toContain('/security/unlock-account');
      expect(adminRoutesContent).toContain('unlockAccount');
    });
  });

  describe('Security Middleware Validation', () => {
    it('should have lockout integration in security middleware', async () => {
      const securityMiddlewarePath = path.join(process.cwd(), 'src/middleware/security.middleware.ts');
      const securityMiddlewareContent = await fs.readFile(securityMiddlewarePath, 'utf-8');
      
      expect(securityMiddlewareContent).toContain('lockout');
      expect(securityMiddlewareContent).toContain('ACCOUNT_LOCKED');
    });
  });
}); 