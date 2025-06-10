import { FastifyInstance } from 'fastify';
import { userSecurityService } from '../services/userSecurity.service.js';
import { auditService } from '../services/audit.service.js';
import { emailService } from '../services/email.service.js';
import { requireAuth, roleBasedAccess } from '../middleware/auth.middleware.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Admin middleware - ensure user is authenticated and has admin role
  fastify.addHook('preHandler', async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    await roleBasedAccess(['ADMIN'])(request, reply);
  });

  // Get all locked accounts with pagination
  fastify.get('/security/locked-accounts', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                accounts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      userId: { type: 'number' },
                      isLocked: { type: 'boolean' },
                      lockoutCount: { type: 'number' },
                      lockoutUntil: { type: 'string', format: 'date-time', nullable: true },
                      lastLockoutReason: { type: 'string', nullable: true },
                      forcePasswordReset: { type: 'boolean' },
                      forcePasswordResetReason: { type: 'string', nullable: true },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          email: { type: 'string' },
                          name: { type: 'string' },
                          role: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                currentPage: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

    try {
      const result = await userSecurityService.getLockedAccounts(page, limit);
      
      // Log admin access
      await auditService.logAdminSecurityAccess(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        'Viewed locked accounts list'
      );

      reply.send({
        success: true,
        data: {
          ...result,
          currentPage: page
        }
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve locked accounts'
      });
    }
  });

  // Get specific user's security status
  fastify.get('/security/user/:userId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'number' }
        },
        required: ['userId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                userId: { type: 'number' },
                isLocked: { type: 'boolean' },
                lockoutCount: { type: 'number' },
                lockoutUntil: { type: 'string', format: 'date-time', nullable: true },
                lastLockoutReason: { type: 'string', nullable: true },
                forcePasswordReset: { type: 'boolean' },
                forcePasswordResetReason: { type: 'string', nullable: true },
                timeUntilUnlock: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: number };

    try {
      const securityStatus = await userSecurityService.getUserSecurityStatus(userId);
      
      // Log admin access
      await auditService.logAdminSecurityAccess(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        `Viewed security status for user ${userId}`
      );

      reply.send({
        success: true,
        data: {
          userId,
          ...securityStatus
        }
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user security status'
      });
    }
  });

  // Manually unlock a user account
  fastify.post('/security/unlock-account/:userId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'number' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', minLength: 1, maxLength: 500 }
        },
        required: ['reason']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: number };
    const { reason } = request.body as { reason: string };

    try {
      // Check if account is actually locked
      const lockStatus = await userSecurityService.isAccountLocked(userId);
      if (!lockStatus.isLocked) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'Account is not currently locked'
        });
        return;
      }

      // Unlock the account
      await userSecurityService.unlockAccount(userId, reason, request.user!.userId);

      // Log admin unlock action
      await auditService.logAdminSecurityAction(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        `Manually unlocked account for user ${userId}. Reason: ${reason}`
      );

      reply.send({
        success: true,
        message: 'Account unlocked successfully'
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to unlock account'
      });
    }
  });

  // Get user security audit logs
  fastify.get('/security/audit-logs/:userId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'number' }
        },
        required: ['userId']
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          eventType: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                logs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      event: { type: 'string' },
                      details: { type: 'string', nullable: true },
                      ipAddress: { type: 'string', nullable: true },
                      userAgent: { type: 'string', nullable: true },
                      successful: { type: 'boolean' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                currentPage: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: number };
    const { page = 1, limit = 20, eventType } = request.query as { 
      page?: number; 
      limit?: number; 
      eventType?: string;
    };

    try {
      const result = await auditService.getUserSecurityLogs(userId, {
        page,
        limit,
        eventType
      });

      // Log admin access
      await auditService.logAdminSecurityAccess(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        `Viewed audit logs for user ${userId}`
      );

      reply.send({
        success: true,
        data: {
          ...result,
          currentPage: page
        }
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve audit logs'
      });
    }
  });

  // Force password reset for a user
  fastify.post('/security/force-password-reset/:userId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'number' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string', minLength: 1, maxLength: 500 }
        },
        required: ['reason']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: number };
    const { reason } = request.body as { reason: string };

    try {
      await userSecurityService.forcePasswordReset(userId, reason);

      // Log admin action
      await auditService.logAdminSecurityAction(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        `Forced password reset for user ${userId}. Reason: ${reason}`
      );

      reply.send({
        success: true,
        message: 'Password reset forced successfully'
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to force password reset'
      });
    }
  });

  // Get security statistics dashboard
  fastify.get('/security/statistics', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalLockedAccounts: { type: 'number' },
                totalForcedPasswordResets: { type: 'number' },
                recentFailedLogins: { type: 'number' },
                recentLockouts: { type: 'number' },
                topLockoutReasons: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      reason: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const stats = await auditService.getSecurityStatistics();

      // Log admin access
      await auditService.logAdminSecurityAccess(
        request.user!.userId,
        request.ip,
        request.headers['user-agent'] as string,
        'Viewed security statistics dashboard'
      );

      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve security statistics'
      });
    }
  });
} 