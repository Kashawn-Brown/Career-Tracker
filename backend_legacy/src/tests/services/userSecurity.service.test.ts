/**
 * User Security Service Tests
 * 
 * Tests the UserSecurityService class for account locking, failed login attempts,
 * suspicious activity detection, and administrative functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userSecurityService } from '../../services/userSecurity.service.js';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    userSecurity: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  };
  
  return {
    PrismaClient: vi.fn(() => mockPrisma)
  };
});

// Mock services
vi.mock('../../services/audit.service.js', () => ({
  auditService: {
    logFailedLogin: vi.fn(),
    logAccountLocked: vi.fn(),
    logAccountUnlocked: vi.fn(),
    logSuspiciousActivity: vi.fn(),
    logForcedPasswordReset: vi.fn(),
    logPasswordResetCompleted: vi.fn()
  }
}));

vi.mock('../../services/email.service.js', () => ({
  emailService: {
    sendAccountLockedEmail: vi.fn(),
    sendAccountUnlockedEmail: vi.fn(),
    sendForcedPasswordResetEmail: vi.fn()
  }
}));

describe('UserSecurityService', () => {
  let mockPrisma: any;
  const mockUserId = 1;
  const mockIpAddress = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 Test Browser';

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked PrismaClient instance
    const { PrismaClient } = await import('@prisma/client');
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserSecurity', () => {
    it('should return existing UserSecurity record', async () => {
      // Arrange
      const mockUserSecurity = {
        id: 1,
        userId: mockUserId,
        isLocked: false,
        lockoutCount: 0,
        lockoutUntil: null,
        lastLockoutReason: null,
        forcePasswordReset: false,
        forcePasswordResetReason: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);

      // Act
      const result = await userSecurityService.getUserSecurity(mockUserId);

      // Assert
      expect(mockPrisma.userSecurity.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId }
      });
      expect(result).toEqual(mockUserSecurity);
    });

    it('should create new UserSecurity record if none exists', async () => {
      // Arrange
      const newUserSecurity = {
        id: 1,
        userId: mockUserId,
        isLocked: false,
        lockoutCount: 0,
        lockoutUntil: null,
        lastLockoutReason: null,
        forcePasswordReset: false,
        forcePasswordResetReason: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(null);
      mockPrisma.userSecurity.create.mockResolvedValue(newUserSecurity);

      // Act
      const result = await userSecurityService.getUserSecurity(mockUserId);

      // Assert
      expect(mockPrisma.userSecurity.create).toHaveBeenCalledWith({
        data: { userId: mockUserId }
      });
      expect(result).toEqual(newUserSecurity);
    });
  });

  describe('isAccountLocked', () => {
    it('should return false when account is not locked', async () => {
      // Arrange
      const mockUserSecurity = {
        isLocked: false,
        lockoutUntil: null,
        lastLockoutReason: null
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);

      // Act
      const result = await userSecurityService.isAccountLocked(mockUserId);

      // Assert
      expect(result).toEqual({ isLocked: false });
    });

    it('should return true when account is locked and lockout has not expired', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const mockUserSecurity = {
        isLocked: true,
        lockoutUntil: futureDate,
        lastLockoutReason: 'Too many failed attempts'
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);

      // Act
      const result = await userSecurityService.isAccountLocked(mockUserId);

      // Assert
      expect(result).toEqual({
        isLocked: true,
        unlockTime: futureDate,
        reason: 'Too many failed attempts'
      });
    });

    it('should auto-unlock account when lockout has expired', async () => {
      // Arrange
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const mockUserSecurity = {
        isLocked: true,
        lockoutUntil: pastDate,
        lastLockoutReason: 'Too many failed attempts'
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);
      mockPrisma.userSecurity.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      });

      // Act
      const result = await userSecurityService.isAccountLocked(mockUserId);

      // Assert
      expect(result).toEqual({ isLocked: false });
      expect(mockPrisma.userSecurity.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          isLocked: false,
          lockoutUntil: null,
          lastLockoutReason: null,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('recordFailedAttempt', () => {
    it('should not increment attempts if account is already locked', async () => {
      // Arrange
      const mockUserSecurity = {
        isLocked: true,
        lockoutCount: 1
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);

      // Act
      const result = await userSecurityService.recordFailedAttempt(
        mockUserId,
        mockIpAddress,
        mockUserAgent
      );

      // Assert
      expect(result).toEqual({ shouldLock: true, lockoutInfo: undefined });
    });

    it('should lock account when max failed attempts reached', async () => {
      // Arrange
      const mockUserSecurity = {
        isLocked: false,
        lockoutCount: 0
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);
      mockPrisma.auditLog.count.mockResolvedValue(5); // Max attempts reached
      mockPrisma.userSecurity.update.mockResolvedValue({
        lockoutCount: 1,
        user: { email: 'test@example.com', name: 'Test User' }
      });

      // Act
      const result = await userSecurityService.recordFailedAttempt(
        mockUserId,
        mockIpAddress,
        mockUserAgent,
        'Invalid password'
      );

      // Assert
      expect(result.shouldLock).toBe(true);
      expect(result.lockoutInfo).toEqual({
        maxFailedAttempts: 5,
        lockoutDurationMinutes: 15
      });
    });

    it('should not lock account when max attempts not reached', async () => {
      // Arrange
      const mockUserSecurity = {
        isLocked: false,
        lockoutCount: 0
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);
      mockPrisma.auditLog.count.mockResolvedValue(3); // Below max attempts

      // Act
      const result = await userSecurityService.recordFailedAttempt(
        mockUserId,
        mockIpAddress,
        mockUserAgent
      );

      // Assert
      expect(result).toEqual({ shouldLock: false });
    });
  });

  describe('lockAccount', () => {
    it('should lock account and send notification', async () => {
      // Arrange
      const config = { maxFailedAttempts: 5, lockoutDurationMinutes: 15 };
      const reason = 'Too many failed attempts';
      const mockUserSecurity = {
        lockoutCount: 1,
        user: { email: 'test@example.com', name: 'Test User' }
      };
      mockPrisma.userSecurity.update.mockResolvedValue(mockUserSecurity);

      // Act
      await userSecurityService.lockAccount(
        mockUserId,
        config,
        reason,
        mockIpAddress,
        mockUserAgent
      );

      // Assert
      expect(mockPrisma.userSecurity.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          isLocked: true,
          lockoutCount: { increment: 1 },
          lockoutUntil: expect.any(Date),
          lastLockoutReason: reason,
          updatedAt: expect.any(Date)
        },
        include: { user: true }
      });
    });
  });

  describe('unlockAccount', () => {
    it('should unlock account and send notification', async () => {
      // Arrange
      const reason = 'Manual unlock by admin';
      const adminId = 2;
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      };
      mockPrisma.userSecurity.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await userSecurityService.unlockAccount(mockUserId, reason, adminId);

      // Assert
      expect(mockPrisma.userSecurity.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          isLocked: false,
          lockoutUntil: null,
          lastLockoutReason: null,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('checkSuspiciousActivity', () => {
    it('should detect suspicious activity with multiple IPs', async () => {
      // Arrange - Need 10+ attempts from 3+ different IPs to trigger
      const mockAuditLogs = Array.from({ length: 12 }, (_, i) => ({
        ipAddress: `192.168.1.${(i % 4) + 1}` // Creates 4 different IPs
      }));
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrisma.userSecurity.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      });

      // Act
      const result = await userSecurityService.checkSuspiciousActivity(mockUserId);

      // Assert
      expect(result.shouldForceReset).toBe(true);
      expect(result.reason).toContain('failed attempts from');
    });

    it('should not detect suspicious activity with normal usage', async () => {
      // Arrange
      const mockAuditLogs = [
        { ipAddress: '192.168.1.1' },
        { ipAddress: '192.168.1.1' }
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      // Act
      const result = await userSecurityService.checkSuspiciousActivity(mockUserId);

      // Assert
      expect(result.shouldForceReset).toBe(false);
    });
  });

  describe('forcePasswordReset', () => {
    it('should force password reset and send notification', async () => {
      // Arrange
      const reason = 'Suspicious activity detected';
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      };
      mockPrisma.userSecurity.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await userSecurityService.forcePasswordReset(mockUserId, reason);

      // Assert
      expect(mockPrisma.userSecurity.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          forcePasswordReset: true,
          forcePasswordResetReason: reason,
          updatedAt: expect.any(Date)
        }
      });
    });
  });

  describe('getUserSecurityStatus', () => {
    it('should return comprehensive security status', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const mockUserSecurity = {
        isLocked: true,
        lockoutCount: 2,
        lockoutUntil: futureDate,
        lastLockoutReason: 'Too many failed attempts',
        forcePasswordReset: false,
        forcePasswordResetReason: null
      };
      mockPrisma.userSecurity.findUnique.mockResolvedValue(mockUserSecurity);

      // Act
      const result = await userSecurityService.getUserSecurityStatus(mockUserId);

      // Assert
      expect(result).toEqual({
        isLocked: true,
        lockoutCount: 2,
        lockoutUntil: futureDate,
        lastLockoutReason: 'Too many failed attempts',
        forcePasswordReset: false,
        forcePasswordResetReason: undefined,
        timeUntilUnlock: expect.any(String)
      });
    });
  });

  describe('getLockedAccounts', () => {
    it('should return paginated locked accounts', async () => {
      // Arrange
      const mockAccounts = [
        {
          id: 1,
          userId: 1,
          isLocked: true,
          lockoutCount: 1,
          user: { id: 1, email: 'user1@example.com', name: 'User 1' }
        },
        {
          id: 2,
          userId: 2,
          isLocked: true,
          lockoutCount: 2,
          user: { id: 2, email: 'user2@example.com', name: 'User 2' }
        }
      ];
      mockPrisma.userSecurity.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.userSecurity.count.mockResolvedValue(2);

      // Act
      const result = await userSecurityService.getLockedAccounts(1, 20);

      // Assert
      expect(result).toEqual({
        accounts: mockAccounts,
        total: 2,
        totalPages: 1
      });
      expect(mockPrisma.userSecurity.findMany).toHaveBeenCalledWith({
        where: { isLocked: true },
        include: { user: true },
        skip: 0,
        take: 20,
        orderBy: { lockoutUntil: 'asc' }
      });
    });
  });

  describe('resetLockoutCount', () => {
    it('should reset lockout count to zero', async () => {
      // Arrange
      mockPrisma.userSecurity.update.mockResolvedValue({});

      // Act
      await userSecurityService.resetLockoutCount(mockUserId);

      // Assert
      expect(mockPrisma.userSecurity.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          lockoutCount: 0,
          updatedAt: expect.any(Date)
        }
      });
    });
  });
}); 