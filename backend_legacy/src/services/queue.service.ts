/**
 * Queue Service
 * 
 * Manages background job processing using Bull queues and Redis.
 * Handles email sending, notifications, and other async tasks.
 */

import Queue from 'bull';
import { emailService } from './email.service.js';
import {
  EmailVerificationData,
  WelcomeEmailData,
  PasswordResetData,
  JobApplicationNotificationData
} from '../models/email.models.js';

// Job data interfaces
export interface EmailVerificationJob {
  type: 'email_verification';
  data: EmailVerificationData;
}

export interface WelcomeEmailJob {
  type: 'welcome_email';
  data: WelcomeEmailData;
}

export interface PasswordResetJob {
  type: 'password_reset';
  data: PasswordResetData;
}

export interface JobApplicationNotificationJob {
  type: 'job_application_notification';
  data: JobApplicationNotificationData;
}

export type EmailJobData = 
  | EmailVerificationJob 
  | WelcomeEmailJob 
  | PasswordResetJob 
  | JobApplicationNotificationJob;

export class QueueService {
  private emailQueue!: Queue.Queue;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeQueues();
  }

  /**
   * Initialize Bull queues with Redis connection
   */
  private initializeQueues(): void {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('REDIS_URL not configured. Queue service will not be functional.');
      return;
    }

    try {
      // Create email queue with Redis connection
      this.emailQueue = new Queue('email processing', redisUrl, {
        defaultJobOptions: {
          removeOnComplete: 10, // Keep last 10 completed jobs
          removeOnFail: 20,     // Keep last 20 failed jobs
          attempts: 3,          // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 2000,        // Start with 2 second delay
          },
        },
      });

      // Set up job processors
      this.setupJobProcessors();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Queue service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize queue service:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if queue service is ready
   */
  isReady(): boolean {
    return this.isInitialized && !!this.emailQueue;
  }

  /**
   * Add email verification job to queue
   */
  async addEmailVerificationJob(data: EmailVerificationData, priority: number = 0): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Queue service is not initialized');
    }

    await this.emailQueue.add('email_verification', {
      type: 'email_verification',
      data
    }, {
      priority, // Higher numbers = higher priority
      delay: 0  // Send immediately
    });
  }

  /**
   * Add welcome email job to queue
   */
  async addWelcomeEmailJob(data: WelcomeEmailData, priority: number = 0): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Queue service is not initialized');
    }

    await this.emailQueue.add('welcome_email', {
      type: 'welcome_email',
      data
    }, {
      priority,
      delay: 0
    });
  }

  /**
   * Add password reset job to queue
   */
  async addPasswordResetJob(data: PasswordResetData, priority: number = 10): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Queue service is not initialized');
    }

    await this.emailQueue.add('password_reset', {
      type: 'password_reset',
      data
    }, {
      priority, // Higher priority for password resets
      delay: 0
    });
  }

  /**
   * Add job application notification job to queue
   */
  async addJobApplicationNotificationJob(data: JobApplicationNotificationData, priority: number = 5): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Queue service is not initialized');
    }

    await this.emailQueue.add('job_application_notification', {
      type: 'job_application_notification',
      data
    }, {
      priority,
      delay: 0
    });
  }

  /**
   * Setup job processors for different email types
   */
  private setupJobProcessors(): void {
    // Process email verification jobs
    this.emailQueue.process('email_verification', async (job) => {
      const jobData = job.data as EmailVerificationJob;
      console.log(`Processing email verification job for: ${jobData.data.to}`);
      
      const result = await emailService.sendEmailVerification(jobData.data);
      
      if (!result.success) {
        throw new Error(result.error || 'Email verification failed');
      }
      
      return result;
    });

    // Process welcome email jobs
    this.emailQueue.process('welcome_email', async (job) => {
      const jobData = job.data as WelcomeEmailJob;
      console.log(`Processing welcome email job for: ${jobData.data.to}`);
      
      const result = await emailService.sendWelcomeEmail(jobData.data);
      
      if (!result.success) {
        throw new Error(result.error || 'Welcome email failed');
      }
      
      return result;
    });

    // Process password reset jobs
    this.emailQueue.process('password_reset', async (job) => {
      const jobData = job.data as PasswordResetJob;
      console.log(`Processing password reset job for: ${jobData.data.to}`);
      
      const result = await emailService.sendPasswordReset(jobData.data);
      
      if (!result.success) {
        throw new Error(result.error || 'Password reset email failed');
      }
      
      return result;
    });

    // Process job application notification jobs
    this.emailQueue.process('job_application_notification', async (job) => {
      const jobData = job.data as JobApplicationNotificationJob;
      console.log(`Processing job application notification for: ${jobData.data.to}`);
      
      const result = await emailService.sendJobApplicationNotification(jobData.data);
      
      if (!result.success) {
        throw new Error(result.error || 'Job application notification failed');
      }
      
      return result;
    });
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    // Job completed successfully
    this.emailQueue.on('completed', (job, result) => {
      console.log(`Email job ${job.id} completed successfully:`, {
        type: job.name,
        recipient: job.data.data?.to,
        messageId: result.messageId
      });
    });

    // Job failed
    this.emailQueue.on('failed', (job, err) => {
      console.error(`Email job ${job.id} failed:`, {
        type: job.name,
        recipient: job.data.data?.to,
        error: err.message,
        attempts: job.attemptsMade
      });
    });

    // Job is waiting
    this.emailQueue.on('waiting', (jobId) => {
      console.log(`Email job ${jobId} is waiting to be processed`);
    });

    // Job started processing
    this.emailQueue.on('active', (job) => {
      console.log(`Email job ${job.id} started processing:`, {
        type: job.name,
        recipient: job.data.data?.to
      });
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    if (!this.isReady()) {
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaiting(),
      this.emailQueue.getActive(),
      this.emailQueue.getCompleted(),
      this.emailQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Gracefully close queue connections
   */
  async close(): Promise<void> {
    if (this.emailQueue) {
      await this.emailQueue.close();
    }
  }
}

// Export singleton instance
export const queueService = new QueueService(); 