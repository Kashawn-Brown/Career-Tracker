/**
 * Security Middleware Tests
 * 
 * Tests the SecurityMiddleware class for CSRF protection, rate limiting,
 * and progressive delay functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SecurityMiddleware } from '../../middleware/security.middleware.js';

// Mock the audit service
vi.mock('../../services/audit.service.js', () => ({
  auditService: {
    logSecurityEvent: vi.fn()
  }
}));

describe('SecurityMiddleware', () => {
  let securityMiddleware: SecurityMiddleware;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    securityMiddleware = new SecurityMiddleware();
    
    // Mock request object
    mockRequest = {
      method: 'POST',
      url: '/test-endpoint',
      ip: '127.0.0.1',
      headers: {},
      body: {}
    };

    // Mock reply object with chainable methods
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    // Clean up any timers
    securityMiddleware.destroy();
    vi.restoreAllMocks();
  });

  describe('CSRF Token Management', () => {
    describe('generateCSRFToken', () => {
      it('should generate a valid base64 token', () => {
        // Act
        const token = securityMiddleware.generateCSRFToken();

        // Assert
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        
        // Should be valid base64
        expect(() => {
          Buffer.from(token, 'base64');
        }).not.toThrow();
      });

      it('should generate unique tokens on each call', () => {
        // Act
        const token1 = securityMiddleware.generateCSRFToken();
        const token2 = securityMiddleware.generateCSRFToken();

        // Assert
        expect(token1).not.toBe(token2);
      });

      it('should generate tokens with timestamp and random components', () => {
        // Act
        const token = securityMiddleware.generateCSRFToken();
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const parts = decoded.split(':');

        // Assert
        expect(parts).toHaveLength(2);
        expect(parseInt(parts[0])).toBeGreaterThan(0); // timestamp
        expect(parts[1]).toBeTruthy(); // random part
      });
    });

    describe('validateCSRFToken', () => {
      it('should validate a freshly generated token', () => {
        // Arrange
        const token = securityMiddleware.generateCSRFToken();

        // Act
        const isValid = securityMiddleware.validateCSRFToken(token);

        // Assert
        expect(isValid).toBe(true);
      });

      it('should reject invalid base64 tokens', () => {
        // Act & Assert
        expect(securityMiddleware.validateCSRFToken('invalid-token')).toBe(false);
        expect(securityMiddleware.validateCSRFToken('')).toBe(false);
      });

      it('should reject tokens with invalid format', () => {
        // Arrange
        const invalidToken = Buffer.from('invalid-format').toString('base64');

        // Act & Assert
        expect(securityMiddleware.validateCSRFToken(invalidToken)).toBe(false);
      });

      it('should reject expired tokens', () => {
        // Arrange
        const oldTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
        const expiredTokenData = `${oldTimestamp}:randompart`;
        const expiredToken = Buffer.from(expiredTokenData).toString('base64');

        // Act & Assert
        expect(securityMiddleware.validateCSRFToken(expiredToken, 60 * 60 * 1000)).toBe(false); // 1 hour max age
      });

      it('should accept tokens within max age', () => {
        // Arrange
        const recentTimestamp = Date.now() - (30 * 60 * 1000); // 30 minutes ago
        const validTokenData = `${recentTimestamp}:randompart`;
        const validToken = Buffer.from(validTokenData).toString('base64');

        // Act & Assert
        expect(securityMiddleware.validateCSRFToken(validToken, 60 * 60 * 1000)).toBe(true); // 1 hour max age
      });
    });

    describe('csrfProtection', () => {
      it('should skip CSRF protection for GET requests', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.method = 'GET';

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should skip CSRF protection for HEAD requests', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.method = 'HEAD';

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should skip CSRF protection for OPTIONS requests', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.method = 'OPTIONS';

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should skip CSRF protection for recovery endpoints', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.url = '/auth/recovery-questions';

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should return 403 when no CSRF token is provided', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.method = 'POST';
        mockRequest.headers = {};
        mockRequest.body = {};

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith({
          error: 'CSRF token required',
          code: 'CSRF_TOKEN_MISSING'
        });
      });

      it('should accept valid CSRF token in header', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        const token = securityMiddleware.generateCSRFToken();
        mockRequest.headers = { 'x-csrf-token': token };

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should accept valid CSRF token in body', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        const token = securityMiddleware.generateCSRFToken();
        mockRequest.body = { csrfToken: token };

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should return 403 for invalid CSRF token', async () => {
        // Arrange
        const middleware = securityMiddleware.csrfProtection();
        mockRequest.headers = { 'x-csrf-token': 'invalid-token' };

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).toHaveBeenCalledWith(403);
        expect(mockReply.send).toHaveBeenCalledWith({
          error: 'Invalid or expired CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
      });
    });

    describe('getCSRFToken', () => {
      it('should return a CSRF token', async () => {
        // Arrange
        const handler = securityMiddleware.getCSRFToken();

        // Act
        await handler(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.send).toHaveBeenCalledWith({
          csrfToken: expect.any(String)
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('rateLimit', () => {
      it('should allow first request without delay', async () => {
        // Arrange
        const middleware = securityMiddleware.rateLimit({ maxAttempts: 5 });
        const startTime = Date.now();

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        const endTime = Date.now();

        // Assert
        expect(endTime - startTime).toBeLessThan(100); // No significant delay
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should apply progressive delay for multiple attempts', async () => {
        // Arrange
        const middleware = securityMiddleware.rateLimit({ maxAttempts: 5 });
        
        // First attempt - no delay
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        
        // Simulate failed attempt by incrementing counter manually
        const key = mockRequest.ip!;
        const record = (securityMiddleware as any).rateLimitStore[key];
        if (record) {
          record.attempts = 2;
          record.lastAttempt = Date.now();
        }

        // Act - Second attempt should have delay
        const startTime = Date.now();
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        const endTime = Date.now();

        // Assert
        expect(endTime - startTime).toBeGreaterThan(1900); // ~2 second delay
        expect(mockReply.status).not.toHaveBeenCalled();
      });

      it('should reset attempts after window expires', async () => {
        // Arrange
        const windowMs = 1000; // 1 second window
        const middleware = securityMiddleware.rateLimit({ maxAttempts: 5, windowMs });
        
        // First attempt
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        
        // Manually set old attempt
        const key = mockRequest.ip!;
        const record = (securityMiddleware as any).rateLimitStore[key];
        if (record) {
          record.attempts = 5;
          record.lastAttempt = Date.now() - (windowMs + 100); // Past the window
        }

        // Act - Should reset and allow without delay
        const startTime = Date.now();
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);
        const endTime = Date.now();

        // Assert
        expect(endTime - startTime).toBeLessThan(100); // No delay
        expect(mockReply.status).not.toHaveBeenCalled();
      });

      it('should use custom key generator', async () => {
        // Arrange
        const customKey = 'custom-user-id';
        const middleware = securityMiddleware.rateLimit({
          keyGenerator: () => customKey
        });

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        const store = (securityMiddleware as any).rateLimitStore;
        expect(store[customKey]).toBeDefined();
        expect(store[mockRequest.ip!]).toBeUndefined();
      });

      it.skip('should call onLimitReached callback when lockout occurs', async () => {
        // Arrange
        const onLimitReached = vi.fn();
        const middleware = securityMiddleware.rateLimit({
          maxAttempts: 2,
          onLimitReached
        });

        // Make enough attempts to trigger lockout (need to exceed threshold for lockout)
        const key = mockRequest.ip!;
        
        // Manually set high attempt count to trigger lockout
        (securityMiddleware as any).rateLimitStore[key] = {
          attempts: 10, // High enough to trigger lockout
          lastAttempt: Date.now()
        };

        // Act - This should trigger lockout and callback
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(onLimitReached).toHaveBeenCalled();
        expect(mockReply.status).toHaveBeenCalledWith(429);
      });
    });

    describe('Account Lockout', () => {
      it('should lock account after multiple failed attempts', async () => {
        // Arrange
        const middleware = securityMiddleware.rateLimit({ maxAttempts: 5 });
        const key = mockRequest.ip!;
        
        // Manually set high attempt count to trigger lockout
        (securityMiddleware as any).rateLimitStore[key] = {
          attempts: 15,
          lastAttempt: Date.now(),
          lockoutUntil: Date.now() + (60 * 60 * 1000) // 1 hour lockout
        };

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).toHaveBeenCalledWith(429);
        expect(mockReply.send).toHaveBeenCalledWith({
          error: expect.stringContaining('Account temporarily locked'),
          code: 'ACCOUNT_LOCKED',
          retryAfter: expect.any(Number)
        });
      });

      it('should allow access after lockout period expires', async () => {
        // Arrange
        const middleware = securityMiddleware.rateLimit({ maxAttempts: 5 });
        const key = mockRequest.ip!;
        
        // Set expired lockout
        (securityMiddleware as any).rateLimitStore[key] = {
          attempts: 15,
          lastAttempt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
          lockoutUntil: Date.now() - (60 * 60 * 1000) // Lockout expired 1 hour ago
        };

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockReply.status).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });
    });

    describe('Specialized Rate Limiters', () => {
      it('should provide login-specific rate limiting', async () => {
        // Arrange
        const middleware = securityMiddleware.loginRateLimit();

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert - Should not throw and should handle request
        expect(mockReply.status).not.toHaveBeenCalled();
      });

      it('should provide security question-specific rate limiting', async () => {
        // Arrange
        const middleware = securityMiddleware.securityQuestionRateLimit();

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert - Should not throw and should handle request
        expect(mockReply.status).not.toHaveBeenCalled();
      });

      it('should provide password reset-specific rate limiting', async () => {
        // Arrange
        const middleware = securityMiddleware.passwordResetRateLimit();

        // Act
        await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert - Should not throw and should handle request
        expect(mockReply.status).not.toHaveBeenCalled();
      });
    });

    describe('Success Tracking', () => {
      it('should mark successful attempts with IP', () => {
        // Arrange
        const key = '192.168.1.1';
        (securityMiddleware as any).rateLimitStore[key] = {
          attempts: 5,
          lastAttempt: Date.now()
        };

        // Act
        securityMiddleware.markSuccessfulAttempt(key);

        // Assert - markSuccessfulAttempt deletes the record entirely
        const record = (securityMiddleware as any).rateLimitStore[key];
        expect(record).toBeUndefined();
      });

      it('should mark successful attempts with request object', () => {
        // Arrange
        const key = mockRequest.ip!;
        (securityMiddleware as any).rateLimitStore[key] = {
          attempts: 5,
          lastAttempt: Date.now()
        };

        // Act
        securityMiddleware.markSuccessfulAttempt(mockRequest as FastifyRequest);

        // Assert - markSuccessfulAttempt deletes the record entirely
        const record = (securityMiddleware as any).rateLimitStore[key];
        expect(record).toBeUndefined();
      });
    });

    describe('Rate Limit Status', () => {
      it('should return rate limit status for key', () => {
        // Arrange
        const key = 'test-key';
        const testRecord = {
          attempts: 3,
          lastAttempt: Date.now(),
          lockoutUntil: Date.now() + 60000
        };
        (securityMiddleware as any).rateLimitStore[key] = testRecord;

        // Act
        const status = securityMiddleware.getRateLimitStatus(key);

        // Assert - Match actual implementation structure
        expect(status).toEqual({
          attempts: 3,
          locked: true,
          lockoutUntil: testRecord.lockoutUntil,
          nextDelay: expect.any(Number)
        });
      });

      it('should return default status for non-existent key', () => {
        // Act
        const status = securityMiddleware.getRateLimitStatus('non-existent');

        // Assert - getRateLimitStatus returns default object, not null
        expect(status).toEqual({
          attempts: 0,
          locked: false,
          lockoutUntil: null
        });
      });
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should clean up expired entries', () => {
      // Arrange
      const now = Date.now();
      const expiredKey = 'expired';
      const validKey = 'valid';
      
      // Create entry that's expired (>24 hours old AND no lockout)
      (securityMiddleware as any).rateLimitStore[expiredKey] = {
        attempts: 1,
        lastAttempt: now - (25 * 60 * 60 * 1000) // 25 hours ago (>24 hours)
      };
      
      // Create entry that's recent (should not be cleaned up)
      (securityMiddleware as any).rateLimitStore[validKey] = {
        attempts: 1,
        lastAttempt: now - (30 * 60 * 1000) // 30 minutes ago
      };

      // Act
      (securityMiddleware as any).cleanupExpiredEntries();

      // Assert
      const store = (securityMiddleware as any).rateLimitStore;
      expect(store[expiredKey]).toBeUndefined();
      expect(store[validKey]).toBeDefined();
    });

    it('should properly destroy the middleware and clear intervals', () => {
      // Arrange
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Act
      securityMiddleware.destroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
}); 