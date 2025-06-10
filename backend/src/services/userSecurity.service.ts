import { PrismaClient, User, UserSecurity } from '@prisma/client';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';

const prisma = new PrismaClient();

export interface LockoutConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export interface SuspiciousActivityCheck {
  multipleIpsThreshold: number;
  timeWindowMinutes: number;
  maxAttemptsFromDifferentIps: number;
}

// Progressive lockout configuration
const LOCKOUT_PROGRESSION: LockoutConfig[] = [
  { maxFailedAttempts: 5, lockoutDurationMinutes: 15 },    // 1st lockout: 15 minutes
  { maxFailedAttempts: 10, lockoutDurationMinutes: 30 },   // 2nd lockout: 30 minutes  
  { maxFailedAttempts: 15, lockoutDurationMinutes: 60 },   // 3rd lockout: 1 hour
  { maxFailedAttempts: 20, lockoutDurationMinutes: 1440 }  // 4th+ lockout: 24 hours
];

const SUSPICIOUS_ACTIVITY_CONFIG: SuspiciousActivityCheck = {
  multipleIpsThreshold: 3,           // 3+ different IPs
  timeWindowMinutes: 60,             // within 1 hour
  maxAttemptsFromDifferentIps: 10    // with 10+ total attempts
};

class UserSecurityService {
  /**
   * Get or create UserSecurity record for a user
   */
  async getUserSecurity(userId: number): Promise<UserSecurity> {
    let userSecurity = await prisma.userSecurity.findUnique({
      where: { userId }
    });

    if (!userSecurity) {
      userSecurity = await prisma.userSecurity.create({
        data: { userId }
      });
    }

    return userSecurity;
  }

  /**
   * Check if user account is currently locked
   */
  async isAccountLocked(userId: number): Promise<{ isLocked: boolean; unlockTime?: Date; reason?: string }> {
    const userSecurity = await this.getUserSecurity(userId);
    
    if (!userSecurity.isLocked) {
      return { isLocked: false };
    }

    // Check if lockout has expired
    if (userSecurity.lockoutUntil && new Date() > userSecurity.lockoutUntil) {
      // Auto-unlock expired lockout
      await this.unlockAccount(userId, 'Automatic unlock - lockout period expired');
      return { isLocked: false };
    }

    return {
      isLocked: true,
      unlockTime: userSecurity.lockoutUntil || undefined,
      reason: userSecurity.lastLockoutReason || undefined
    };
  }

  /**
   * Record a failed login attempt and potentially lock account
   */
  async recordFailedAttempt(
    userId: number, 
    ipAddress: string, 
    userAgent: string,
    reason: string = 'Failed login attempt'
  ): Promise<{ shouldLock: boolean; lockoutInfo?: LockoutConfig }> {
    const userSecurity = await this.getUserSecurity(userId);
    
    // Don't increment if already locked
    if (userSecurity.isLocked) {
      return { shouldLock: true, lockoutInfo: undefined };
    }

    // Determine current lockout level based on lockout count
    const lockoutLevel = Math.min(userSecurity.lockoutCount, LOCKOUT_PROGRESSION.length - 1);
    const currentConfig = LOCKOUT_PROGRESSION[lockoutLevel];

    // Check if we should lock the account
    if (await this.shouldLockAccount(userId, currentConfig.maxFailedAttempts)) {
      await this.lockAccount(userId, currentConfig, reason, ipAddress, userAgent);
      return { shouldLock: true, lockoutInfo: currentConfig };
    }

    // Just log the failed attempt
    await auditService.logFailedLogin(userId, ipAddress, userAgent, reason);
    return { shouldLock: false };
  }

  /**
   * Check if account should be locked based on failed attempts
   */
  private async shouldLockAccount(userId: number, maxAttempts: number): Promise<boolean> {
    // Count recent failed login attempts (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentFailedAttempts = await prisma.auditLog.count({
      where: {
        userId,
        event: 'LOGIN_FAILURE',
        successful: false,
        createdAt: { gte: oneHourAgo }
      }
    });

    return recentFailedAttempts >= maxAttempts;
  }

  /**
   * Lock user account
   */
  async lockAccount(
    userId: number, 
    config: LockoutConfig,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const lockoutUntil = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000);
    
    const userSecurity = await prisma.userSecurity.update({
      where: { userId },
      data: {
        isLocked: true,
        lockoutCount: { increment: 1 },
        lockoutUntil,
        lastLockoutReason: reason,
        updatedAt: new Date()
      },
      include: { user: true }
    });

    // Log the lockout event
    await auditService.logAccountLocked(
      userId, 
      ipAddress, 
      userAgent,
      JSON.stringify({
        reason,
        lockoutUntil: lockoutUntil.toISOString(),
        lockoutCount: userSecurity.lockoutCount,
        durationMinutes: config.lockoutDurationMinutes
      })
    );

    // Send lockout notification email
    await emailService.sendAccountLockedEmail(
      userSecurity.user.email,
      userSecurity.user.name,
      lockoutUntil,
      reason
    );
  }

  /**
   * Unlock user account (admin or automatic)
   */
  async unlockAccount(userId: number, reason: string, adminId?: number): Promise<void> {
    await prisma.userSecurity.update({
      where: { userId },
      data: {
        isLocked: false,
        lockoutUntil: null,
        lastLockoutReason: null,
        updatedAt: new Date()
      }
    });

    // Log the unlock event
    await auditService.logAccountUnlocked(
      userId,
      undefined,
      undefined,
      JSON.stringify({ reason, unlockedBy: adminId ? `Admin ${adminId}` : 'System' })
    );

    // Send unlock notification email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await emailService.sendAccountUnlockedEmail(user.email, user.name, reason);
    }
  }

  /**
   * Check for suspicious activity and potentially force password reset
   */
  async checkSuspiciousActivity(userId: number): Promise<{ shouldForceReset: boolean; reason?: string }> {
    const config = SUSPICIOUS_ACTIVITY_CONFIG;
    const timeWindow = new Date(Date.now() - config.timeWindowMinutes * 60 * 1000);

    // Get recent failed attempts from different IPs
    const recentAttempts = await prisma.auditLog.findMany({
      where: {
        userId,
        event: 'LOGIN_FAILURE',
        successful: false,
        createdAt: { gte: timeWindow },
        ipAddress: { not: null }
      },
      select: { ipAddress: true }
    });

    // Count unique IPs
    const uniqueIps = new Set(recentAttempts.map(attempt => attempt.ipAddress).filter(Boolean));
    
    if (uniqueIps.size >= config.multipleIpsThreshold && 
        recentAttempts.length >= config.maxAttemptsFromDifferentIps) {
      
      const reason = `Suspicious activity: ${recentAttempts.length} failed attempts from ${uniqueIps.size} different IPs`;
      await this.forcePasswordReset(userId, reason);
      
      return { shouldForceReset: true, reason };
    }

    return { shouldForceReset: false };
  }

  /**
   * Force password reset for security reasons
   */
  async forcePasswordReset(userId: number, reason: string): Promise<void> {
    await prisma.userSecurity.update({
      where: { userId },
      data: {
        forcePasswordReset: true,
        forcePasswordResetReason: reason,
        updatedAt: new Date()
      }
    });

    // Log the forced reset event
    await auditService.logForcedPasswordReset(userId, undefined, undefined, reason);

    // Send forced reset notification email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await emailService.sendForcedPasswordResetEmail(user.email, user.name, reason);
    }
  }

  /**
   * Clear forced password reset flag (after user resets password)
   */
  async clearForcePasswordReset(userId: number): Promise<void> {
    await prisma.userSecurity.update({
      where: { userId },
      data: {
        forcePasswordReset: false,
        forcePasswordResetReason: null,
        updatedAt: new Date()
      }
    });

    await auditService.logPasswordResetCompleted(userId);
  }

  /**
   * Reset lockout count (after successful login)
   */
  async resetLockoutCount(userId: number): Promise<void> {
    await prisma.userSecurity.update({
      where: { userId },
      data: {
        lockoutCount: 0,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get locked accounts (admin function)
   */
  async getLockedAccounts(page = 1, limit = 20): Promise<{
    accounts: Array<UserSecurity & { user: User }>;
    total: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      prisma.userSecurity.findMany({
        where: { isLocked: true },
        include: { user: true },
        orderBy: { lockoutUntil: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.userSecurity.count({
        where: { isLocked: true }
      })
    ]);

    return {
      accounts,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user security status for display
   */
  async getUserSecurityStatus(userId: number): Promise<{
    isLocked: boolean;
    lockoutCount: number;
    lockoutUntil?: Date;
    lastLockoutReason?: string;
    forcePasswordReset: boolean;
    forcePasswordResetReason?: string;
    timeUntilUnlock?: string;
  }> {
    const userSecurity = await this.getUserSecurity(userId);
    
    let timeUntilUnlock: string | undefined;
    if (userSecurity.isLocked && userSecurity.lockoutUntil) {
      const now = new Date();
      const unlockTime = userSecurity.lockoutUntil;
      
      if (unlockTime > now) {
        const diffMs = unlockTime.getTime() - now.getTime();
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));
        
        if (diffMinutes > 60) {
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;
          timeUntilUnlock = `${hours}h ${minutes}m`;
        } else {
          timeUntilUnlock = `${diffMinutes}m`;
        }
      }
    }

    return {
      isLocked: userSecurity.isLocked,
      lockoutCount: userSecurity.lockoutCount,
      lockoutUntil: userSecurity.lockoutUntil || undefined,
      lastLockoutReason: userSecurity.lastLockoutReason || undefined,
      forcePasswordReset: userSecurity.forcePasswordReset,
      forcePasswordResetReason: userSecurity.forcePasswordResetReason || undefined,
      timeUntilUnlock
    };
  }
}

export const userSecurityService = new UserSecurityService(); 