/**
 * Email Routes
 * 
 * Production email endpoints for job application notifications,
 * security alerts, and other email functionality.
 */

import { FastifyPluginAsync } from 'fastify';
import { emailController } from '../controllers/index.js';

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

const emailRoutes: FastifyPluginAsync = async (fastify) => {
  // Job application notification email
  fastify.post<JobApplicationNotificationRequest>('/job-application-notification', {
    schema: {
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
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, emailController.sendJobApplicationNotification.bind(emailController));

  // Security notification emails
  fastify.post<SecurityNotificationRequest>('/security-notification', {
    schema: {
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
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, emailController.sendSecurityNotification.bind(emailController));
};

export default emailRoutes; 