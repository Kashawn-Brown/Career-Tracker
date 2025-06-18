/**
 * Email Routes
 * 
 * Production email endpoints for job application notifications,
 * security alerts, and other email functionality.
 * Registers routes with Fastify including validation schemas, rate limiting, and handlers.
 */

import { FastifyInstance } from 'fastify';
import { emailController } from '../controllers/index.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import { commonErrorResponses } from '../utils/errorSchemas.js';

// Rate limiting configuration
const emailRateLimit = {
  max: 10, // 10 emails per 5 minutes to prevent spam
  timeWindow: 5 * 60 * 1000 // 5 minutes
};

interface JobApplicationNotificationRequest {
  Body: {
    to: string;
    userName: string;
    company: string;
    position: string;
    applicationDate: string;
  };
}

interface SecurityNotificationRequest {
  Body: {
    type: string;
    to: string;
    userName: string;
    [key: string]: any;
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

const jobApplicationNotificationSchema = {
  body: {
    type: 'object',
    required: ['to', 'userName', 'company', 'position', 'applicationDate'],
    properties: {
      to: { type: 'string', format: 'email' },
      userName: { type: 'string' },
      company: { type: 'string' },
      position: { type: 'string' },
      applicationDate: { type: 'string' }
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

const securityNotificationSchema = {
  body: {
    type: 'object',
    required: ['type', 'to', 'userName'],
    properties: {
      type: { type: 'string' },
      to: { type: 'string', format: 'email' },
      userName: { type: 'string' }
    },
    additionalProperties: true
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

export default async function emailRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared error response schemas

  // POST /job-application-notification - Send job application notification email
  fastify.post<JobApplicationNotificationRequest>('/job-application-notification', {
    config: {
      rateLimit: emailRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...jobApplicationNotificationSchema,
      response: {
        ...jobApplicationNotificationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.sendJobApplicationNotification
  });

  // POST /security-notification - Send security notification emails
  fastify.post<SecurityNotificationRequest>('/security-notification', {
    config: {
      rateLimit: emailRateLimit
    },
    preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()],
    schema: {
      ...securityNotificationSchema,
      response: {
        ...securityNotificationSchema.response,
        ...commonErrorResponses
      }
    },
    handler: emailController.sendSecurityNotification
  });
} 