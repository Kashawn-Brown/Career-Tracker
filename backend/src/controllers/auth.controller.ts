/**
 * Authentication Controller
 * 
 * Handles all authentication endpoints including registration, login,
 * email verification, token refresh, and logout.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/index.js';
import { userRepository } from '../repositories/index.js';
import { queueService } from '../services/queue.service.js';

export class AuthController {
  /**
   * Register a new user with email and password
   * POST /api/auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the users registration details from the request body
    const { email, password, name } = request.body as {
      email: string;
      password: string;
      name: string;
    };

    // Make the call to the auth service to register the user
    const result = await authService.registerUser(email, password, name);

    // If the user registration fails, build response and return the error
    if (!result.success) {
      const response: any = { error: result.error };
      if (result.details) response.details = result.details;
      if (result.action) {
        response.action = result.action;
        response.message = result.message;
      }
      return reply.status(result.statusCode).send(response);
    }

    // If the user registration succeeds, return the user and tokens
    return reply.status(result.statusCode).send({
      message: result.message,
      user: result.user,
      tokens: result.tokens
    });
  }

  /**
   * Login with email and password
   * POST /api/auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the users login details from the request body
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    // Make the call to the auth service to login the user
    const result = await authService.loginUser(email, password);

    // If the user login fails, return the error
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }
    
    // If the user login succeeds, return the user and tokens
    return reply.status(result.statusCode).send({
      message: result.message,
      user: result.user,
      tokens: result.tokens
    });
  }

  /**
   * Verify email with token
   * POST /api/auth/verify-email
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Retrieve the token from the request body
      const { token } = request.body as { token: string };

      // If the token is not provided, return an error
      if (!token) {
        return reply.status(400).send({
          error: 'Verification token is required'
        });
      }

      // Verify the token using the service
      const result = await authService.verifyEmailToken(token);

      // If the email verification fails, return the error
      if (!result.success) {
        const statusCode = result.action === 'resend_verification' ? 400 : 400;
        return reply.status(statusCode).send({
          error: result.message,
          action: result.action,
          message: result.action === 'resend_verification' ? 'Please request a new verification email' : undefined
        });
      }

      // Email verified successfully! Send welcome email
      try {
        // We need to get the user info to send the welcome email
        const user = await userRepository.findByEmailToken(token);
        if (user && queueService.isReady()) {
          await queueService.addWelcomeEmailJob({
            to: user.email,
            userName: user.name
          });
          console.log(`Welcome email job queued for: ${user.email}`);
        }
      } catch (emailError) {
        console.error('Failed to queue welcome email:', emailError);
        // Don't fail verification if welcome email queueing fails
      }

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Email verification error:', error);
      return reply.status(500).send({
        error: 'Internal server error during email verification'
      });
    }
  }

  /**
   * Refresh JWT tokens
   * POST /api/auth/refresh
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.status(400).send({
          error: 'Refresh token is required'
        });
      }

      // Refresh tokens using the service
      const tokens = await authService.refreshTokens(refreshToken);

      return reply.send({
        message: 'Tokens refreshed successfully',
        tokens
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      
      if (error instanceof Error && (error.message.includes('invalid') || error.message.includes('expired'))) {
        return reply.status(401).send({
          error: 'Invalid or expired refresh token'
        });
      }

      return reply.status(500).send({
        error: 'Internal server error during token refresh'
      });
    }
  }

  /**
   * Resend email verification
   * POST /api/auth/resend-verification
   */
  async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      // Validate email format
      if (!authService.isValidEmail(email)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Resend verification using the service
      const result = await authService.resendEmailVerification(email);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      // Send verification email via queue
      try {
        const user = await userRepository.findByEmail(email);
        if (user && result.token && queueService.isReady()) {
          await queueService.addEmailVerificationJob({
            to: email,
            userName: user.name,
            verificationToken: result.token,
            verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${result.token}`
          });
          console.log(`Email verification job re-queued for: ${email}`);
        } else {
          console.warn(`Queue service not available. New email verification token for ${email}: ${result.token}`);
        }
      } catch (emailError) {
        console.error('Failed to queue verification email:', emailError);
        // Don't fail the operation if email queueing fails
      }

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      return reply.status(500).send({
        error: 'Internal server error during resend verification'
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };

    const result = await authService.initiatePasswordReset(email);

    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    return reply.status(result.statusCode).send({
      message: result.message
    });
  }

  /**
   * Verify password reset token
   * GET /api/auth/reset-password/:token
   */
  async verifyPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.params as { token: string };

      if (!token) {
        return reply.status(400).send({
          error: 'Password reset token is required'
        });
      }

      // Verify the token using the service
      const result = await authService.verifyPasswordResetToken(token);

      if (!result.valid) {
        return reply.status(400).send({
          message: result.message,
          valid: false
        });
      }

      return reply.send({
        message: result.message,
        valid: true
      });

    } catch (error) {
      console.error('Password reset token verification error:', error);
      return reply.status(500).send({
        error: 'Internal server error during token verification'
      });
    }
  }

  /**
   * Reset password using valid token
   * POST /api/auth/reset-password/:token
   */
  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.params as { token: string };
      const { password } = request.body as { password: string };

      if (!password) {
        return reply.status(400).send({
          error: 'New password is required'
        });
      }

      // Collect security metadata
      const securityMetadata = {
        ipAddress: request.ip || request.socket.remoteAddress || 'Unknown',
        userAgent: request.headers['user-agent'] || 'Unknown',
        timestamp: new Date()
      };

      // Reset password with enhanced notifications
      const result = await authService.resetPassword(token, password, securityMetadata);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return reply.status(500).send({
        error: 'Internal server error during password reset'
      });
    }
  }

  /**
   * Set up security questions for a user
   * POST /api/auth/security-questions
   */
  async setupSecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { questions } = request.body as {
        questions: Array<{ question: string; answer: string }>
      };

      // Get user ID from JWT token (assuming we have auth middleware)
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply.status(401).send({
          error: 'Authentication required'
        });
      }

      // Validate questions array
      if (!questions || !Array.isArray(questions)) {
        return reply.status(400).send({
          error: 'Questions array is required'
        });
      }

      if (questions.length < 3 || questions.length > 5) {
        return reply.status(400).send({
          error: 'Must provide between 3 and 5 security questions'
        });
      }

      // Check for duplicate questions
      const questionTypes = questions.map(q => q.question);
      const uniqueQuestions = new Set(questionTypes);
      if (uniqueQuestions.size !== questionTypes.length) {
        return reply.status(400).send({
          error: 'Duplicate questions are not allowed'
        });
      }

      // Set up security questions using the service
      const result = await authService.setupSecurityQuestions(user.id, questions);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      return reply.send({
        message: result.message,
        questionsSet: questions.length
      });

    } catch (error) {
      console.error('Setup security questions error:', error);
      return reply.status(500).send({
        error: 'Internal server error during security questions setup'
      });
    }
  }

  /**
   * Get user's security questions (authenticated)
   * GET /api/auth/security-questions
   */
  async getSecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get user ID from JWT token (assuming we have auth middleware)
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply.status(401).send({
          error: 'Authentication required'
        });
      }

      // Get security questions using the service
      const result = await authService.getUserSecurityQuestions(user.id);

      return reply.send({
        message: 'Security questions retrieved successfully',
        questions: result.questions
      });

    } catch (error) {
      console.error('Get security questions error:', error);
      return reply.status(500).send({
        error: 'Internal server error while retrieving security questions'
      });
    }
  }

  /**
   * Get recovery questions for an email (public)
   * POST /api/auth/recovery-questions
   */
  async getRecoveryQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      // Validate email format
      if (!authService.isValidEmail(email)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Get recovery questions using the service
      const result = await authService.getRecoveryQuestions(email);

      return reply.send({
        message: result.message,
        questions: result.questions || []
      });

    } catch (error) {
      console.error('Get recovery questions error:', error);
      return reply.status(500).send({
        error: 'Internal server error while retrieving recovery questions'
      });
    }
  }

  /**
   * Verify security questions for account recovery
   * POST /api/auth/verify-security-questions
   */
  async verifySecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, answers } = request.body as {
        email: string;
        answers: Array<{ questionId: number; answer: string }>
      };

      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      if (!answers || !Array.isArray(answers) || answers.length < 2) {
        return reply.status(400).send({
          error: 'At least 2 answers are required'
        });
      }

      // Get client IP and User-Agent for security logging
      const clientIP = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

      // Verify security questions using the service
      const result = await authService.verifySecurityQuestions(email, answers);

      // Log the attempt with client details
      console.log(`[SECURITY_AUDIT] Security Questions Verification: Email=${email}, Success=${result.verified}, IP=${clientIP}, UserAgent=${userAgent}`);

      return reply.send({
        message: result.message,
        verified: result.verified,
        resetToken: result.resetToken || null
      });

    } catch (error) {
      console.error('Verify security questions error:', error);
      return reply.status(500).send({
        error: 'Internal server error during security questions verification'
      });
    }
  }

  /**
   * Get available security question types with display text
   * GET /api/auth/available-security-questions
   */
  async getAvailableSecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get available security questions using the service
      const result = await authService.getAvailableSecurityQuestions();

      return reply.send({
        message: 'Available security questions retrieved successfully',
        questions: result.questions
      });

    } catch (error) {
      console.error('Get available security questions error:', error);
      return reply.status(500).send({
        error: 'Internal server error while retrieving available security questions'
      });
    }
  }

  /**
   * Set up secondary email for authenticated user
   * POST /api/auth/secondary-email
   */
  async setupSecondaryEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { secondaryEmail } = request.body as { secondaryEmail: string };

      // Get user ID from JWT token
      const user = (request as any).user;
      if (!user || !user.id) {
        return reply.status(401).send({
          error: 'Authentication required'
        });
      }

      if (!secondaryEmail) {
        return reply.status(400).send({
          error: 'Secondary email is required'
        });
      }

      // Set up secondary email using the service
      const result = await authService.setupSecondaryEmail(user.id, secondaryEmail);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Setup secondary email error:', error);
      return reply.status(500).send({
        error: 'Internal server error during secondary email setup'
      });
    }
  }

  /**
   * Verify secondary email token
   * POST /api/auth/verify-secondary-email
   */
  async verifySecondaryEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.body as { token: string };

      if (!token) {
        return reply.status(400).send({
          error: 'Verification token is required'
        });
      }

      // Verify the token using the service
      const result = await authService.verifySecondaryEmail(token);

      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Verify secondary email error:', error);
      return reply.status(500).send({
        error: 'Internal server error during secondary email verification'
      });
    }
  }

  /**
   * Request password reset via secondary email
   * POST /api/auth/forgot-password-secondary
   */
  async forgotPasswordSecondary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      // Validate email format
      if (!authService.isValidEmail(email)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Request password reset using the service
      const result = await authService.requestPasswordResetSecondary(email);

      return reply.send({
        message: result.message
      });

    } catch (error) {
      console.error('Secondary email password reset error:', error);
      return reply.status(500).send({
        error: 'Internal server error during password reset request'
      });
    }
  }

}

export const authController = new AuthController(); 