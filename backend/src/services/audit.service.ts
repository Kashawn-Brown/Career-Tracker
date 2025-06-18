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
  async logAccountLocked(userId: number, ipAddress?: string, userAgent?: string, details?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.ACCOUNT_LOCKED,
      details: details ? JSON.parse(details) : undefined,
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

  // Admin-specific audit methods

  /**
   * Log admin security access
   */
  async logAdminSecurityAccess(adminId: number, ipAddress?: string, userAgent?: string, details?: string): Promise<void> {
    await this.logEvent({
      userId: adminId,
      event: AuditEventType.ADMIN_LOGIN,
      details: { action: 'security_access', description: details },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log admin security action
   */
  async logAdminSecurityAction(adminId: number, action: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId: adminId,
      event: AuditEventType.ADMIN_LOGIN,
      details: { action: 'security_action', description: action },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log account unlocked
   */
  async logAccountUnlocked(userId: number, ipAddress?: string, userAgent?: string, details?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.ACCOUNT_UNLOCKED,
      details: details ? JSON.parse(details) : undefined,
      ipAddress,
      userAgent,
      successful: true,
    });
  }

  /**
   * Log forced password reset
   */
  async logForcedPasswordReset(userId: number, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.PASSWORD_RESET_FORCED,
      details: { reason },
      ipAddress,
      userAgent,
      successful: true,
    });
  }

  /**
   * Log password reset completed
   */
  async logPasswordResetCompleted(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.PASSWORD_CHANGE,
      details: { type: 'forced_reset_completed' },
      ipAddress,
      userAgent,
      successful: true,
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(userId: number, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.LOGIN_FAILURE,
      details: { reason },
      ipAddress,
      userAgent,
      successful: false,
    });
  }

  /**
   * Get user security logs with pagination
   */
  async getUserSecurityLogs(userId: number, options: {
    page?: number;
    limit?: number;
    eventType?: string;
  } = {}): Promise<{
    logs: any[];
    total: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, eventType } = options;
    const offset = (page - 1) * limit;

    const where: any = { userId };
    
    // Filter by security-related events
    const securityEvents = [
      AuditEventType.LOGIN_SUCCESS,
      AuditEventType.LOGIN_FAILURE,
      AuditEventType.ACCOUNT_LOCKED,
      AuditEventType.ACCOUNT_UNLOCKED,
      AuditEventType.PASSWORD_CHANGE,
      AuditEventType.PASSWORD_RESET_FORCED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.MULTIPLE_FAILED_ATTEMPTS
    ];

    if (eventType) {
      where.event = eventType;
    } else {
      where.event = { in: securityEvents };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null,
      })),
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get security statistics for admin dashboard
   */
  async getSecurityStatistics(): Promise<{
    totalLockedAccounts: number;
    totalForcedPasswordResets: number;
    recentFailedLogins: number;
    recentLockouts: number;
    topLockoutReasons: Array<{ reason: string; count: number }>;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalLockedAccounts,
      totalForcedPasswordResets,
      recentFailedLogins,
      recentLockouts,
      lockoutReasons
    ] = await Promise.all([
      // Total currently locked accounts
      prisma.userSecurity.count({
        where: { isLocked: true }
      }),
      
      // Total accounts with forced password reset
      prisma.userSecurity.count({
        where: { forcePasswordReset: true }
      }),
      
      // Failed logins in last 24 hours
      prisma.auditLog.count({
        where: {
          event: AuditEventType.LOGIN_FAILURE,
          createdAt: { gte: twentyFourHoursAgo }
        }
      }),
      
      // Account lockouts in last 24 hours
      prisma.auditLog.count({
        where: {
          event: AuditEventType.ACCOUNT_LOCKED,
          createdAt: { gte: twentyFourHoursAgo }
        }
      }),
      
      // Top lockout reasons
      prisma.userSecurity.groupBy({
        by: ['lastLockoutReason'],
        where: {
          lastLockoutReason: { not: null }
        },
        _count: { lastLockoutReason: true },
        orderBy: { _count: { lastLockoutReason: 'desc' } },
        take: 5
      })
    ]);

    return {
      totalLockedAccounts,
      totalForcedPasswordResets,
      recentFailedLogins,
      recentLockouts,
      topLockoutReasons: lockoutReasons.map(reason => ({
        reason: reason.lastLockoutReason || 'Unknown',
        count: reason._count.lastLockoutReason
      }))
    };
  }

  // ============================================================================
  // DATA OPERATION AUDIT LOGGING
  // ============================================================================

  /**
   * Log data operation events (CREATE, READ, UPDATE, DELETE)
   * For contacts, documents, job applications, etc.
   */
  async logDataOperation(entry: {
    userId: number;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
    resourceType: 'CONTACT' | 'DOCUMENT' | 'JOB_APPLICATION' | 'JOB_CONNECTION' | 'TAG';
    resourceId?: string | number;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    successful?: boolean;
  }): Promise<void> {
    await this.logEvent({
      userId: entry.userId,
      event: AuditEventType.LOGIN_SUCCESS, // Generic event for data access operations
      details: {
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ...entry.details
      },
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      successful: entry.successful ?? true,
    });
  }

  /**
   * Log contact operations
   */
  async logContactOperation(
    userId: number, 
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    contactId?: number,
    details?: Record<string, any>,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.logDataOperation({
      userId,
      action,
      resourceType: 'CONTACT',
      resourceId: contactId,
      details: {
        contactName: details?.name,
        company: details?.company,
        ...details
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log document operations
   */
  async logDocumentOperation(
    userId: number,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    documentId?: number,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logDataOperation({
      userId,
      action,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      details: {
        filename: details?.filename,
        originalName: details?.originalName,
        fileSize: details?.fileSize,
        mimeType: details?.mimeType,
        jobApplicationId: details?.jobApplicationId,
        ...details
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log job application operations
   */
  async logJobApplicationOperation(
    userId: number,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    jobApplicationId?: number,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logDataOperation({
      userId,
      action,
      resourceType: 'JOB_APPLICATION',
      resourceId: jobApplicationId,
      details: {
        company: details?.company,
        position: details?.position,
        status: details?.status,
        ...details
      },
      ipAddress,
      userAgent
    });
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(
    userId: number,
    action: 'BULK_CREATE' | 'BULK_UPDATE' | 'BULK_DELETE',
    resourceType: 'CONTACT' | 'DOCUMENT' | 'JOB_APPLICATION',
    count: number,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      event: AuditEventType.LOGIN_SUCCESS, // Generic event for data operations
      details: {
        action,
        resourceType,
        count,
        ...details
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log suspicious data access patterns
   */
  async logSuspiciousDataAccess(
    userId: number,
    pattern: 'RAPID_ACCESS' | 'BULK_DOWNLOAD' | 'UNUSUAL_HOURS' | 'EXCESSIVE_QUERIES',
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSuspiciousActivity(
      userId,
      `SUSPICIOUS_DATA_ACCESS_${pattern}`,
      details,
      ipAddress,
      userAgent
    );
  }

  /**
   * Get data operation statistics for a user
   */
  async getUserDataOperationStats(userId: number, hours: number = 24): Promise<{
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByResource: Record<string, number>;
    recentOperations: any[];
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        event: AuditEventType.LOGIN_SUCCESS // Generic event for data operations
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const operationsByType: Record<string, number> = {};
    const operationsByResource: Record<string, number> = {};

    logs.forEach(log => {
      if (log.details) {
        try {
          const details = JSON.parse(log.details);
          const action = details.action || 'UNKNOWN';
          const resourceType = details.resourceType || 'UNKNOWN';
          
          operationsByType[action] = (operationsByType[action] || 0) + 1;
          operationsByResource[resourceType] = (operationsByResource[resourceType] || 0) + 1;
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });

    return {
      totalOperations: logs.length,
      operationsByType,
      operationsByResource,
      recentOperations: logs.slice(0, 10)
    };
  }
}

export const auditService = new AuditService(); 