/**
 * Test Email Routes
 * 
 * Simple endpoints for testing email service functionality
 * Should be removed or secured before production
 */

import { FastifyPluginAsync } from 'fastify';
import { emailController } from '../controllers/index.js';

interface TestEmailRequest {
  Body: {
    to: string;
    name: string;
  };
}

interface EmailStatusQuery {
  Querystring: {
    email: string;
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
  }, emailController.sendTestVerification.bind(emailController));

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
  }, emailController.sendTestWelcome.bind(emailController));

  // Test email verification via queue (instant response)
  fastify.post<TestEmailRequest>('/test-queue-verification', {
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
            jobQueued: { type: 'boolean' },
            note: { type: 'string' }
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
  }, emailController.queueTestVerification.bind(emailController));

  // Get queue statistics
  fastify.get('/queue-stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            queueReady: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                waiting: { type: 'number' },
                active: { type: 'number' },
                completed: { type: 'number' },
                failed: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, emailController.getQueueStats.bind(emailController));

  // Get verification token for testing (DEVELOPMENT ONLY!)
  fastify.get<EmailStatusQuery>('/get-verification-token', {
    schema: {
      querystring: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            token: { type: 'string' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, emailController.getVerificationToken.bind(emailController));

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
  }, emailController.getEmailStatus.bind(emailController));
};

export default testEmailRoutes;