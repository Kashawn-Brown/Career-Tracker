/**
 * Audit Service Tests
 * 
 * Tests the AuditService class for security audit logging, filtering,
 * and security statistics functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditService } from '../../services/audit.service.js';
import { AuditEventType } from '@prisma/client';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn()
    },
    userSecurity: {
      count: vi.fn(),
      groupBy: vi.fn()
    }
  };
  
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  AuditEventType: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
    EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
    SECURITY_QUESTIONS_SETUP: 'SECURITY_QUESTIONS_SETUP',
    SECURITY_QUESTIONS_CHANGE: 'SECURITY_QUESTIONS_CHANGE',
    SECURITY_QUESTION_VERIFICATION_SUCCESS: 'SECURITY_QUESTION_VERIFICATION_SUCCESS',
    SECURITY_QUESTION_VERIFICATION_FAILURE: 'SECURITY_QUESTION_VERIFICATION_FAILURE',
    SECONDARY_EMAIL_ADDED: 'SECONDARY_EMAIL_ADDED',
    SECONDARY_EMAIL_CHANGED: 'SECONDARY_EMAIL_CHANGED',
    SECONDARY_EMAIL_VERIFICATION: 'SECONDARY_EMAIL_VERIFICATION',
    SECONDARY_EMAIL_RECOVERY: 'SECONDARY_EMAIL_RECOVERY',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    MULTIPLE_FAILED_ATTEMPTS: 'MULTIPLE_FAILED_ATTEMPTS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ADMIN_SECURITY_ACCESS: 'ADMIN_SECURITY_ACCESS',
    ADMIN_SECURITY_ACTION: 'ADMIN_SECURITY_ACTION',
    FORCED_PASSWORD_RESET: 'FORCED_PASSWORD_RESET',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED'
  }
  };
});

describe('AuditService', () => {
  let mockPrisma: any;
  const mockUserId = 1;
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 Test Browser';
  const mockEmail = 'test@example.com';

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked PrismaClient instance
    const { PrismaClient } = await import('@prisma/client');
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create audit service instance', () => {
    expect(auditService).toBeDefined();
  });

  describe('logEvent', () => {
    it('should create audit log entry successfully', async () => {
      // Arrange
      const entry = {
        userId: mockUserId,
        event: AuditEventType.LOGIN_SUCCESS,
        details: { method: 'password' },
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        successful: true
      };
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logEvent(entry);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.LOGIN_SUCCESS,
          details: JSON.stringify({ method: 'password' }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const entry = {
        userId: mockUserId,
        event: AuditEventType.LOGIN_SUCCESS
      };
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await auditService.logEvent(entry);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to log audit event:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle null details correctly', async () => {
      // Arrange
      const entry = {
        userId: mockUserId,
        event: AuditEventType.LOGOUT,
        ipAddress: mockIpAddress
      };
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logEvent(entry);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.LOGOUT,
          details: null,
          ipAddress: mockIpAddress,
          userAgent: undefined,
          successful: true
        }
      });
    });
  });

  describe('Authentication Events', () => {
    it('should log successful login', async () => {
      // Arrange
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logLoginSuccess(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.LOGIN_SUCCESS,
          details: null,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should log failed login attempt', async () => {
      // Arrange
      const reason = 'Invalid password';
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logLoginFailure(mockEmail, mockIpAddress, mockUserAgent, reason);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          event: AuditEventType.LOGIN_FAILURE,
          details: JSON.stringify({ email: mockEmail, reason }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: false
        }
      });
    });

    it('should log logout', async () => {
      // Arrange
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logLogout(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.LOGOUT,
          details: null,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });
  });

  describe('Password Events', () => {
    it('should log password change', async () => {
      // Arrange
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logPasswordChange(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.PASSWORD_CHANGE,
          details: null,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should log password reset request', async () => {
      // Arrange
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logPasswordResetRequest(mockEmail, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          event: AuditEventType.PASSWORD_RESET_REQUEST,
          details: JSON.stringify({ email: mockEmail }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should log successful password reset', async () => {
      // Arrange
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logPasswordResetSuccess(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.PASSWORD_RESET_SUCCESS,
          details: null,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });
  });

  describe('Security Events', () => {
    it('should log security questions setup', async () => {
      // Arrange
      const questionCount = 3;
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logSecurityQuestionsSetup(mockUserId, questionCount, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.SECURITY_QUESTIONS_SETUP,
          details: JSON.stringify({ questionCount }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should log suspicious activity', async () => {
      // Arrange
      const activityType = 'multiple_ips';
      const details = { ipCount: 5, timeWindow: '1 hour' };
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logSuspiciousActivity(mockUserId, activityType, details, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.SUSPICIOUS_ACTIVITY,
          details: JSON.stringify({ activityType, ...details }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: false
        }
      });
    });

    it('should log account locked', async () => {
      // Arrange
      const details = JSON.stringify({ reason: 'Too many failed attempts' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logAccountLocked(mockUserId, mockIpAddress, mockUserAgent, details);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.ACCOUNT_LOCKED,
          details: JSON.stringify({ reason: 'Too many failed attempts' }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: false
        }
      });
    });

    it('should log account unlocked', async () => {
      // Arrange
      const details = JSON.stringify({ reason: 'Manual unlock by admin' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logAccountUnlocked(mockUserId, mockIpAddress, mockUserAgent, details);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          event: AuditEventType.ACCOUNT_UNLOCKED,
          details: JSON.stringify({ reason: 'Manual unlock by admin' }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return filtered audit logs', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 1,
          userId: mockUserId,
          event: AuditEventType.LOGIN_SUCCESS,
          createdAt: new Date(),
          ipAddress: mockIpAddress,
          details: null
        }
      ];
      const filter = {
        userId: mockUserId,
        event: AuditEventType.LOGIN_SUCCESS,
        limit: 10
      };
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);

      // Act
      const result = await auditService.getAuditLogs(filter);

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          event: AuditEventType.LOGIN_SUCCESS
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
      expect(result).toEqual(mockLogs);
    });

    it('should handle date range filtering', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const filter = { startDate, endDate };
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      // Act
      await auditService.getAuditLogs(filter);

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0
      });
    });
  });

  describe('getRecentFailedAttempts', () => {
    it('should count recent failed attempts from IP', async () => {
      // Arrange
      const timeWindow = 15; // minutes
      mockPrisma.auditLog.count.mockResolvedValue(5);

      // Act
      const result = await auditService.getRecentFailedAttempts(mockIpAddress, timeWindow);

      // Assert
      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          ipAddress: mockIpAddress,
          event: {
            in: ['LOGIN_FAILURE', 'SECURITY_QUESTION_VERIFICATION_FAILURE']
          },
          createdAt: {
            gte: expect.any(Date)
          }
        }
      });
      expect(result).toBe(5);
    });
  });

  describe('getUserSecurityEvents', () => {
    it('should return user security events within time window', async () => {
      // Arrange
      const hours = 24;
      const mockEvents = [
        { event: AuditEventType.LOGIN_SUCCESS, createdAt: new Date(), details: null },
        { event: AuditEventType.PASSWORD_CHANGE, createdAt: new Date(), details: null }
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockEvents);

      // Act
      const result = await auditService.getUserSecurityEvents(mockUserId, hours);

      // Assert
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          createdAt: {
            gte: expect.any(Date)
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs', async () => {
      // Arrange
      const days = 90;
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 150 });

      // Act
      const result = await auditService.cleanupOldLogs(days);

      // Assert
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date)
          }
        }
      });
      expect(result).toBe(150);
    });
  });

  describe('getUserSecurityLogs', () => {
    it('should return paginated user security logs', async () => {
      // Arrange
      const mockLogs = [
        { id: 1, event: AuditEventType.LOGIN_SUCCESS, createdAt: new Date(), details: null },
        { id: 2, event: AuditEventType.PASSWORD_CHANGE, createdAt: new Date(), details: null }
      ];
      const options = { page: 1, limit: 10, eventType: 'LOGIN_SUCCESS' };
      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(2);

      // Act
      const result = await auditService.getUserSecurityLogs(mockUserId, options);

      // Assert
      expect(result).toEqual({
        logs: mockLogs,
        total: 2,
        totalPages: 1
      });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          event: 'LOGIN_SUCCESS'
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('getSecurityStatistics', () => {
    it('should return comprehensive security statistics', async () => {
      // Arrange
      mockPrisma.userSecurity.count
        .mockResolvedValueOnce(undefined) // totalLockedAccounts
        .mockResolvedValueOnce(undefined); // totalForcedPasswordResets

      mockPrisma.auditLog.count
        .mockResolvedValueOnce(5) // recentFailedLogins
        .mockResolvedValueOnce(3); // recentLockouts

      mockPrisma.userSecurity.groupBy.mockResolvedValue([
        { lastLockoutReason: 'Too many failed attempts', _count: { lastLockoutReason: 3 } },
        { lastLockoutReason: 'Suspicious activity', _count: { lastLockoutReason: 2 } }
      ]);

      // Act
      const result = await auditService.getSecurityStatistics();

      // Assert
      expect(result).toEqual({
        totalLockedAccounts: undefined,
        totalForcedPasswordResets: undefined,
        recentFailedLogins: 5,
        recentLockouts: 3,
        topLockoutReasons: [
          { reason: 'Too many failed attempts', count: 3 },
          { reason: 'Suspicious activity', count: 2 }
        ]
      });
    });
  });

  describe('Admin Events', () => {
    it('should log admin security access', async () => {
      // Arrange
      const adminId = 2;
      const details = 'Accessed user security dashboard';
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logAdminSecurityAccess(adminId, mockIpAddress, mockUserAgent, details);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: adminId,
          event: undefined,
          details: JSON.stringify({
            action: 'security_access',
            description: details
          }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });

    it('should log admin security action', async () => {
      // Arrange
      const adminId = 2;
      const action = 'Unlocked user account';
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Act
      await auditService.logAdminSecurityAction(adminId, action, mockIpAddress, mockUserAgent);

      // Assert
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: adminId,
          event: undefined,
          details: JSON.stringify({
            action: 'security_action',
            description: action
          }),
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          successful: true
        }
      });
    });
  });
}); 