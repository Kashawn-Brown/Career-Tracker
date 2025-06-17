/**
 * Email Controller
 * 
 * Handles all email endpoints including verification tests, 
 * status checks, and email notifications.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { emailService } from '../services/index.js';
import { queueService } from '../services/queue.service.js';

export class EmailController {

  // EMAIL TESTING & VERIFICATION

  /**
   * Send test email verification
   * POST /api/test/test-verification
   */
  async sendTestVerification(request: FastifyRequest, reply: FastifyReply) {
    const { to, name } = request.body as {
      to?: string;
      name?: string;
    };

    // Validate input
    if (!to || !name) {
      return reply.status(400).send({
        error: 'Missing required fields: to, name'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to send test verification
    const result = await emailService.sendTestEmailVerification(to, name);

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      success: result.success,
      message: result.message,
      messageId: result.messageId
    });
  }

  /**
   * Send test welcome email
   * POST /api/test/test-welcome
   */
  async sendTestWelcome(request: FastifyRequest, reply: FastifyReply) {
    const { to, name } = request.body as {
      to?: string;
      name?: string;
    };

    // Validate input
    if (!to || !name) {
      return reply.status(400).send({
        error: 'Missing required fields: to, name'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to send test welcome email
    const result = await emailService.sendTestWelcomeEmail(to, name);

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      success: result.success,
      message: result.message,
      messageId: result.messageId
    });
  }

  /**
   * Queue test email verification (instant response)
   * POST /api/test/test-queue-verification
   */
  async queueTestVerification(request: FastifyRequest, reply: FastifyReply) {
    const { to, name } = request.body as {
      to?: string;
      name?: string;
    };

    // Validate input
    if (!to || !name) {
      return reply.status(400).send({
        error: 'Missing required fields: to, name'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to queue test verification
    const result = await emailService.queueTestEmailVerification(to, name);

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      success: result.success,
      message: result.message,
      jobQueued: result.jobQueued,
      note: result.note
    });
  }

  // EMAIL STATUS & CONFIGURATION

  /**
   * Get email service status and configuration
   * GET /api/test/email-status
   */
  async getEmailStatus(request: FastifyRequest, reply: FastifyReply) {
    // Call email service to get status
    const result = await emailService.getEmailServiceStatus();

    return reply.status(result.statusCode).send({
      configured: result.configured,
      message: result.message,
      config: result.config
    });
  }

  /**
   * Get queue service statistics
   * GET /api/test/queue-stats
   */
  async getQueueStats(request: FastifyRequest, reply: FastifyReply) {
    // Call email service to get queue stats
    const result = await emailService.getQueueServiceStats();

    return reply.status(result.statusCode).send({
      queueReady: result.queueReady,
      stats: result.stats
    });
  }

  // DEVELOPMENT UTILITIES

  /**
   * Get verification token for testing (DEVELOPMENT ONLY!)
   * GET /api/test/get-verification-token
   */
  async getVerificationToken(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.query as { email?: string };

    // Validate input
    if (!email) {
      return reply.status(400).send({
        error: 'Email parameter is required'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(email)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to get verification token
    const result = await emailService.getVerificationToken(email);

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      email: result.email,
      token: result.token,
      message: result.message
    });
  }

  // NOTIFICATION EMAILS

  /**
   * Send job application notification
   * POST /api/email/job-application-notification
   */
  async sendJobApplicationNotification(request: FastifyRequest, reply: FastifyReply) {
    const { to, userName, company, position, applicationDate } = request.body as {
      to?: string;
      userName?: string;
      company?: string;
      position?: string;
      applicationDate?: string;
    };

    // Validate input
    if (!to || !userName || !company || !position || !applicationDate) {
      return reply.status(400).send({
        error: 'Missing required fields: to, userName, company, position, applicationDate'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to send job application notification
    const result = await emailService.sendJobApplicationNotificationEmail({
      to,
      userName,
      company,
      position,
      applicationDate
    });

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      success: result.success,
      message: result.message,
      messageId: result.messageId
    });
  }

  /**
   * Send security notification emails
   * POST /api/email/security-notification
   */
  async sendSecurityNotification(request: FastifyRequest, reply: FastifyReply) {
    const { type, to, userName, ...additionalData } = request.body as {
      type?: string;
      to?: string;
      userName?: string;
      [key: string]: any;
    };

    // Validate input
    if (!type || !to || !userName) {
      return reply.status(400).send({
        error: 'Missing required fields: type, to, userName'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    // Call email service to send security notification
    const result = await emailService.sendSecurityNotificationEmail(type, to, userName, additionalData);

    // Handle service response
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      success: result.success,
      message: result.message,
      messageId: result.messageId
    });
  }
}

export const emailController = new EmailController(); 