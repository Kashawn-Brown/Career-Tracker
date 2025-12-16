/**
 * Test Email Routes
 * 
 * Simple endpoints for testing email service functionality.
 * Should be removed or secured before production.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
 */

import { FastifyInstance } from 'fastify';
import { emailController } from '../controllers/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const testEmailRateLimit = {
  max: 5, // 5 test emails per 2 minutes to prevent spam
  timeWindow: 2 * 60 * 1000 // 2 minutes
};

const statusCheckRateLimit = {
  max: 20, // 20 status checks per minute
  timeWindow: 60 * 1000 // 1 minute
};

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

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    timestamp: { type: 'string' },
    path: { type: 'string' }
  },
  required: ['success', 'error', 'message', 'statusCode', 'timestamp', 'path']
};

const testEmailSchema = {
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
    }
  }
};

const queueTestSchema = {
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
    }
  }
};

const queueStatsSchema = {
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
};

const verificationTokenSchema = {
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
};

const emailStatusSchema = {
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
};

export default async function testEmailRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // POST /test-verification - Test email verification
  fastify.post<TestEmailRequest>('/test-verification', {
    config: {
      rateLimit: testEmailRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...testEmailSchema,
      response: {
        ...testEmailSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.sendTestVerification
  });

  // POST /test-welcome - Test welcome email
  fastify.post<TestEmailRequest>('/test-welcome', {
    config: {
      rateLimit: testEmailRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...testEmailSchema,
      response: {
        ...testEmailSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.sendTestWelcome
  });

  // POST /test-queue-verification - Test email verification via queue
  fastify.post<TestEmailRequest>('/test-queue-verification', {
    config: {
      rateLimit: testEmailRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...queueTestSchema,
      response: {
        ...queueTestSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.queueTestVerification
  });

  // GET /queue-stats - Get queue statistics
  fastify.get('/queue-stats', {
    config: {
      rateLimit: statusCheckRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...queueStatsSchema,
      response: {
        ...queueStatsSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.getQueueStats
  });

  // GET /get-verification-token - Get verification token for testing (DEVELOPMENT ONLY!)
  fastify.get<EmailStatusQuery>('/get-verification-token', {
    config: {
      rateLimit: statusCheckRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...verificationTokenSchema,
      response: {
        ...verificationTokenSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.getVerificationToken
  });

  // GET /email-status - Check email service status
  fastify.get('/email-status', {
    config: {
      rateLimit: statusCheckRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...emailStatusSchema,
      response: {
        ...emailStatusSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.getEmailStatus
  });
}