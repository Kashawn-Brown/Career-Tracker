/**
 * Audit Service
 * 
 * Handles security audit logging for all authentication and account-related events.
 * Provides comprehensive tracking of user activities for security monitoring.
 */

import { PrismaClient, AuditEventType } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  userId?: number;
  event: AuditEventType;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  successful?: boolean;
}

export interface AuditLogFilter {
  userId?: number;
  event?: AuditEventType;
  successful?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {

  /**
   * Log an audit event
   */
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          event: entry.event,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          successful: entry.successful ?? true,
        },
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log successful login
   */
  async logLoginSuccess(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      successful: true,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailure(email: string, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logEvent({
      event: AuditEventType.LOGIN_FAILURE,
      details: { email, reason },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.LOGOUT,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.PASSWORD_CHANGE,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      event: AuditEventType.PASSWORD_RESET_REQUEST,
      details: { email },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log successful password reset
   */
  async logPasswordResetSuccess(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.PASSWORD_RESET_SUCCESS,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log email verification
   */
  async logEmailVerification(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.EMAIL_VERIFICATION,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security questions setup
   */
  async logSecurityQuestionsSetup(userId: number, questionCount: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECURITY_QUESTIONS_SETUP,
      details: { questionCount },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security questions change
   */
  async logSecurityQuestionsChange(userId: number, changedCount: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECURITY_QUESTIONS_CHANGE,
      details: { changedCount },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log successful security question verification
   */
  async logSecurityQuestionVerificationSuccess(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECURITY_QUESTION_VERIFICATION_SUCCESS,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed security question verification
   */
  async logSecurityQuestionVerificationFailure(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      event: AuditEventType.SECURITY_QUESTION_VERIFICATION_FAILURE,
      details: { email },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Log secondary email added
   */
  async logSecondaryEmailAdded(userId: number, secondaryEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECONDARY_EMAIL_ADDED,
      details: { secondaryEmail },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log secondary email changed
   */
  async logSecondaryEmailChanged(userId: number, oldEmail: string, newEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECONDARY_EMAIL_CHANGED,
      details: { oldEmail, newEmail },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log secondary email verification
   */
  async logSecondaryEmailVerification(userId: number, secondaryEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SECONDARY_EMAIL_VERIFICATION,
      details: { secondaryEmail },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log secondary email recovery attempt
   */
  async logSecondaryEmailRecovery(email: string, successful: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      event: AuditEventType.SECONDARY_EMAIL_RECOVERY,
      details: { email },
      ipAddress,
      userAgent,
      successful,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: number | undefined,
    activityType: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SUSPICIOUS_ACTIVITY,
      details: { activityType, ...details },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Log multiple failed attempts
   */
  async logMultipleFailedAttempts(
    userId: number | undefined,
    attemptType: string,
    attemptCount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.MULTIPLE_FAILED_ATTEMPTS,
      details: { attemptType, attemptCount },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Log account locked
   */
  async logAccountLocked(userId: number, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.ACCOUNT_LOCKED,
      details: { reason },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Log session expired
   */
  async logSessionExpired(userId: number): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.SESSION_EXPIRED,
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filter: AuditLogFilter = {}) {
    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.event) {
      where.event = filter.event;
    }

    if (filter.successful !== undefined) {
      where.successful = filter.successful;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    if (filter.ipAddress) {
      where.ipAddress = filter.ipAddress;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });

    return auditLogs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Get recent failed login attempts for an IP address
   */
  async getRecentFailedAttempts(ipAddress: string, timeWindow: number = 15): Promise<number> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const count = await prisma.auditLog.count({
      where: {
        event: {
          in: [
            AuditEventType.LOGIN_FAILURE,
            AuditEventType.SECURITY_QUESTION_VERIFICATION_FAILURE,
          ],
        },
        ipAddress,
        createdAt: {
          gte: since,
        },
      },
    });

    return count;
  }

  /**
   * Get security events for a user within a timeframe
   */
  async getUserSecurityEvents(userId: number, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await this.getAuditLogs({
      userId,
      startDate: since,
      limit: 50,
    });
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  async cleanupOldLogs(days: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

export const auditService = new AuditService(); 