/**
 * Test Email Routes
 * 
 * Simple endpoints for testing email service functionality
 * Should be removed or secured before production
 */

import { FastifyPluginAsync } from 'fastify';
import { emailService } from '../services/email.service.js';

interface TestEmailRequest {
  Body: {
    to: string;
    name: string;
  };
}

const testEmailRoutes: FastifyPluginAsync = async (fastify) => {
  // Test email verification
  fastify.post<TestEmailRequest>('/test-verification', {
    schema: {
      body: {
        type: 'object',
        required: ['to', 'name'],
        properties: {
          to: { type: 'string', format: 'email' },
          name: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            messageId: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { to, name } = request.body;

    // Check if email service is configured
    if (!emailService.isReady()) {
      return reply.status(400).send({
        error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
      });
    }

    try {
      const result = await emailService.sendEmailVerification({
        to,
        userName: name,
        verificationToken: 'test-token-123',
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=test-token-123`
      });

      if (result.success) {
        return reply.send({
          success: true,
          message: `Test verification email sent to ${to}`,
          messageId: result.messageId
        });
      } else {
        return reply.status(400).send({
          error: result.error || 'Failed to send email'
        });
      }
    } catch (error) {
      fastify.log.error('Email test error:', error);
      return reply.status(500).send({
        error: 'Internal server error'
      });
    }
  });

  // Test welcome email
  fastify.post<TestEmailRequest>('/test-welcome', {
    schema: {
      body: {
        type: 'object',
        required: ['to', 'name'],
        properties: {
          to: { type: 'string', format: 'email' },
          name: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            messageId: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { to, name } = request.body;

    if (!emailService.isReady()) {
      return reply.status(400).send({
        error: 'Email service is not configured. Please check SENDGRID_API_KEY environment variable.'
      });
    }

    try {
      const result = await emailService.sendWelcomeEmail({
        to,
        userName: name
      });

      if (result.success) {
        return reply.send({
          success: true,
          message: `Test welcome email sent to ${to}`,
          messageId: result.messageId
        });
      } else {
        return reply.status(400).send({
          error: result.error || 'Failed to send email'
        });
      }
    } catch (error) {
      fastify.log.error('Email test error:', error);
      return reply.status(500).send({
        error: 'Internal server error'
      });
    }
  });

  // Check email service status
  fastify.get('/email-status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            configured: { type: 'boolean' },
            message: { type: 'string' },
            config: {
              type: 'object',
              properties: {
                fromEmail: { type: 'string' },
                fromName: { type: 'string' },
                hasApiKey: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const isReady = emailService.isReady();
    
    return reply.send({
      configured: isReady,
      message: isReady ? 'Email service is ready' : 'Email service needs configuration',
      config: {
        fromEmail: process.env.FROM_EMAIL || 'noreply@career-tracker.com',
        fromName: process.env.FROM_NAME || 'Career Tracker',
        hasApiKey: !!process.env.SENDGRID_API_KEY
      }
    });
  });
};

export default testEmailRoutes; 