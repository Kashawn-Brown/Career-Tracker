/**
 * Security Middleware
 * 
 * Provides CSRF protection, rate limiting, and progressive delays
 * for authentication and sensitive endpoints (Fastify compatible).
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from '../services/audit.service.js';

interface DelayRecord {
  attempts: number;
  lastAttempt: number;
  lockoutUntil?: number;
}

interface RateLimitStore {
  [key: string]: DelayRecord;
}

export class SecurityMiddleware {
  private rateLimitStore: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000);
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return Buffer.from(`${timestamp}:${random}`).toString('base64');
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string, maxAge: number = 60 * 60 * 1000): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const [timestamp, _random] = decoded.split(':');
      
      if (!timestamp || !_random) {
        return false;
      }

      const tokenTime = parseInt(timestamp);
      const now = Date.now();
      
      return (now - tokenTime) <= maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * CSRF Protection Hook for Fastify
   */
  csrfProtection() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return;
      }

      // Skip CSRF for certain endpoints (like public recovery endpoints)
      const skipRoutes = [
        '/auth/recovery-questions',
        '/auth/verify-security-questions',
        '/auth/forgot-password-secondary'
      ];

      if (skipRoutes.some(route => request.url.includes(route))) {
        return;
      }

      const token = request.headers['x-csrf-token'] as string || (request.body as any)?.csrfToken;

      if (!token) {
        reply.status(403).send({
          error: 'CSRF token required',
          code: 'CSRF_TOKEN_MISSING'
        });
        return;
      }

      if (!this.validateCSRFToken(token)) {
        reply.status(403).send({
          error: 'Invalid or expired CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
        return;
      }
    };
  }

  /**
   * Get CSRF token endpoint handler
   */
  getCSRFToken() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const token = this.generateCSRFToken();
      reply.send({ csrfToken: token });
    };
  }

  /**
   * Progressive delay calculation based on failed attempts
   */
  private calculateDelay(attempts: number): number {
    if (attempts <= 1) return 0;
    if (attempts <= 3) return 2000;  // 2 seconds
    if (attempts <= 5) return 5000;  // 5 seconds
    if (attempts <= 10) return 15000; // 15 seconds
    return 60000; // 1 minute
  }

  /**
   * Get lockout duration based on attempts
   */
  private getLockoutDuration(attempts: number): number {
    if (attempts >= 15) return 24 * 60 * 60 * 1000; // 24 hours
    if (attempts >= 10) return 60 * 60 * 1000;      // 1 hour
    if (attempts >= 8) return 30 * 60 * 1000;       // 30 minutes
    if (attempts >= 6) return 15 * 60 * 1000;       // 15 minutes
    return 0; // No lockout
  }

  /**
   * Rate limiting hook with progressive delays
   */
  rateLimit(options: {
    windowMs?: number;
    maxAttempts?: number;
    keyGenerator?: (req: FastifyRequest) => string;
    skipSuccessfulRequests?: boolean;
    onLimitReached?: (req: FastifyRequest, record: DelayRecord) => void;
  } = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxAttempts = 5,
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
      onLimitReached
    } = options;

    return async (request: FastifyRequest, reply: FastifyReply) => {
      const key = keyGenerator(request);
      const now = Date.now();
      
      let record = this.rateLimitStore[key];
      
      if (!record) {
        record = { attempts: 0, lastAttempt: now };
        this.rateLimitStore[key] = record;
      }

      // Check if currently locked out
      if (record.lockoutUntil && now < record.lockoutUntil) {
        const remainingMs = record.lockoutUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        
        reply.status(429).send({
          error: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: remainingMs
        });
        return;
      }

      // Reset counter if window has passed
      if (now - record.lastAttempt > windowMs) {
        record.attempts = 0;
        record.lockoutUntil = undefined;
      }

      // Calculate delay for current attempt
      const delay = this.calculateDelay(record.attempts);
      
      if (delay > 0) {
        // Add delay before processing
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await this.processRequest(request, reply, record, now, maxAttempts, onLimitReached);
    };
  }

  private async processRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    record: DelayRecord,
    now: number,
    maxAttempts: number,
    onLimitReached?: (req: FastifyRequest, record: DelayRecord) => void
  ) {
    // Increment attempts
    record.attempts++;
    record.lastAttempt = now;

    // Check for lockout
    const lockoutDuration = this.getLockoutDuration(record.attempts);
    if (lockoutDuration > 0) {
      record.lockoutUntil = now + lockoutDuration;
      
      if (onLimitReached) {
        onLimitReached(request, record);
      }

      const remainingMinutes = Math.ceil(lockoutDuration / (60 * 1000));
      reply.status(429).send({
        error: `Too many failed attempts. Account locked for ${remainingMinutes} minute(s).`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: lockoutDuration
      });
      return;
    }

    // Add attempt info to request for logging
    (request as any).rateLimitInfo = {
      attempts: record.attempts,
      isNearLimit: record.attempts >= maxAttempts - 2
    };
  }

  /**
   * Specific rate limiter for login attempts
   */
  loginRateLimit() {
    return this.rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
      keyGenerator: (req) => req.ip,
      onLimitReached: async (req, record) => {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] as string;
        
        await auditService.logMultipleFailedAttempts(
          undefined,
          'login',
          record.attempts,
          ipAddress,
          userAgent
        );

        await auditService.logSuspiciousActivity(
          undefined,
          'excessive_login_attempts',
          {
            attempts: record.attempts,
            lockoutDuration: record.lockoutUntil ? record.lockoutUntil - Date.now() : 0
          },
          ipAddress,
          userAgent
        );
      }
    });
  }

  /**
   * Rate limiter for security question verification
   */
  securityQuestionRateLimit() {
    return this.rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 3, // More restrictive for security questions
      keyGenerator: (req) => `${req.ip}-${(req.body as any)?.email || 'unknown'}`,
      onLimitReached: async (req, record) => {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] as string;
        const email = (req.body as any)?.email;
        
        await auditService.logMultipleFailedAttempts(
          undefined,
          'security_question_verification',
          record.attempts,
          ipAddress,
          userAgent
        );
      }
    });
  }

  /**
   * Rate limiter for password reset requests
   */
  passwordResetRateLimit() {
    return this.rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
      keyGenerator: (req) => `${req.ip}-${(req.body as any)?.email || 'unknown'}`,
      onLimitReached: async (req, record) => {
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'] as string;
        
        await auditService.logSuspiciousActivity(
          undefined,
          'excessive_password_reset_requests',
          {
            attempts: record.attempts,
            email: (req.body as any)?.email
          },
          ipAddress,
          userAgent
        );
      }
    });
  }

  /**
   * Mark successful attempt (resets counter)
   */
  markSuccessfulAttempt(keyOrReq: string | FastifyRequest) {
    const key = typeof keyOrReq === 'string' 
      ? keyOrReq 
      : keyOrReq.ip;
    
    if (this.rateLimitStore[key]) {
      delete this.rateLimitStore[key];
    }
  }

  /**
   * Clean up expired entries from rate limit store
   */
  private cleanupExpiredEntries() {
    const now = Date.now();
    const expireBefore = now - (24 * 60 * 60 * 1000); // 24 hours ago
    
    Object.keys(this.rateLimitStore).forEach(key => {
      const record = this.rateLimitStore[key];
      if (record.lastAttempt < expireBefore && (!record.lockoutUntil || record.lockoutUntil < now)) {
        delete this.rateLimitStore[key];
      }
    });
  }

  /**
   * Get current rate limit status for a key
   */
  getRateLimitStatus(key: string) {
    const record = this.rateLimitStore[key];
    if (!record) {
      return {
        attempts: 0,
        locked: false,
        lockoutUntil: null
      };
    }

    const now = Date.now();
    const locked = record.lockoutUntil ? now < record.lockoutUntil : false;

    return {
      attempts: record.attempts,
      locked,
      lockoutUntil: record.lockoutUntil || null,
      nextDelay: this.calculateDelay(record.attempts + 1)
    };
  }

  /**
   * Rate limiting for data access operations (GET requests for user data)
   * Provides moderate protection for read operations
   */
  dataAccessRateLimit() {
    return this.rateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxAttempts: 60,      // 60 requests per minute
      keyGenerator: (req) => `data_access:${req.user?.userId || req.ip}`,
      skipSuccessfulRequests: true,
      onLimitReached: (req, record) => {
        // Log excessive data access attempts
        console.warn(`Excessive data access attempts from user ${req.user?.userId || 'unknown'} (${req.ip}): ${record.attempts} attempts`);
      }
    });
  }

  /**
   * Rate limiting for data modification operations (POST, PUT, DELETE)
   * Provides stricter protection for write operations
   */
  dataModificationRateLimit() {
    return this.rateLimit({
      windowMs: 60 * 1000, // 1 minute
      maxAttempts: 30,      // 30 requests per minute
      keyGenerator: (req) => `data_mod:${req.user?.userId || req.ip}`,
      skipSuccessfulRequests: true,
      onLimitReached: (req, record) => {
        // Log excessive modification attempts
        console.warn(`Excessive data modification attempts from user ${req.user?.userId || 'unknown'} (${req.ip}): ${record.attempts} attempts`);
      }
    });
  }

  /**
   * Rate limiting for file upload operations
   * Provides strict protection for resource-intensive operations
   */
  fileUploadRateLimit() {
    return this.rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 10,          // 10 uploads per 5 minutes
      keyGenerator: (req) => `file_upload:${req.user?.userId || req.ip}`,
      skipSuccessfulRequests: true,
      onLimitReached: (req, record) => {
        // Log excessive upload attempts
        console.warn(`Excessive file upload attempts from user ${req.user?.userId || 'unknown'} (${req.ip}): ${record.attempts} attempts`);
      }
    });
  }

  /**
   * Cleanup on service shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const securityMiddleware = new SecurityMiddleware(); 