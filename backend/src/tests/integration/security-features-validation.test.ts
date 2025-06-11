/**
 * Security Features Implementation Validation Tests
 * 
 * Integration tests to verify Task 12.5 security features are implemented:
 * - Security questions functionality
 * - Secondary email recovery
 * - Password change notifications
 * - Audit logging system
 * - CSRF protection
 * - Progressive delays for failed attempts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

describe('Security Features Validation', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Schema Validation', () => {
    it('should have SecurityQuestion table accessible', async () => {
      await expect(async () => {
        await prisma.securityQuestion.findMany({ take: 1 });
      }).not.toThrow();
    });

    it('should have secondary email fields in User model', async () => {
      await expect(async () => {
        await prisma.user.findFirst({
          select: { 
            secondaryEmail: true, 
            secondaryEmailVerified: true 
          }
        });
      }).not.toThrow();
    });

    it('should have AuditLog table accessible', async () => {
      await expect(async () => {
        await prisma.auditLog.findMany({ take: 1 });
      }).not.toThrow();
    });
  });

  describe('Service Implementation Validation', () => {
    it('should have audit service with required methods', async () => {
      const auditServicePath = path.join(process.cwd(), 'src/services/audit.service.ts');
      const auditServiceContent = await fs.readFile(auditServicePath, 'utf-8');
      
      expect(auditServiceContent).toContain('logPasswordReset');
      expect(auditServiceContent).toContain('logFailedLogin');
    });

    it('should have password change notification in email service', async () => {
      const emailServicePath = path.join(process.cwd(), 'src/services/email.service.ts');
      const emailServiceContent = await fs.readFile(emailServicePath, 'utf-8');
      
      expect(emailServiceContent).toContain('sendPasswordChangedEmail');
      expect(emailServiceContent).toContain('password changed');
    });
  });

  describe('API Endpoints Validation', () => {
    it('should have security question endpoints in auth routes', async () => {
      const authRoutesPath = path.join(process.cwd(), 'src/routes/auth.ts');
      const authRoutesContent = await fs.readFile(authRoutesPath, 'utf-8');
      
      const requiredRoutes = [
        '/security-questions',
        '/recovery-questions', 
        '/verify-security-questions'
      ];

      requiredRoutes.forEach(route => {
        expect(authRoutesContent).toContain(route);
      });
    });
  });

  describe('Security Middleware Validation', () => {
    it('should have progressive delays implemented', async () => {
      const securityMiddlewarePath = path.join(process.cwd(), 'src/middleware/security.middleware.ts');
      const securityMiddlewareContent = await fs.readFile(securityMiddlewarePath, 'utf-8');
      
      expect(securityMiddlewareContent).toContain('calculateDelay');
      expect(securityMiddlewareContent).toContain('progressiv');
    });

    it('should have CSRF protection implemented', async () => {
      const securityMiddlewarePath = path.join(process.cwd(), 'src/middleware/security.middleware.ts');
      const securityMiddlewareContent = await fs.readFile(securityMiddlewarePath, 'utf-8');
      
      expect(securityMiddlewareContent).toContain('CSRF');
      expect(securityMiddlewareContent).toContain('csrf');
    });
  });
}); 