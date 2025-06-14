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
import { jwtService } from '../services/jwt.service.js';

export class AuthController {

  // CORE AUTHENTICATION
  
  /**
   * Register a new user with email and password
   * POST /api/auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the users registration details from the request body
    const { email, password, name } = request.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    // Validate input
    if (!email || !password || !name) {
      return reply.status(400).send({
        error: 'Missing required fields: email, password, name'
      });
    }

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
      email?: string;
      password?: string;
    };

    // Validate input
    if (!email || !password) {
      return reply.status(400).send({
        error: 'Email and password are required'
      });
    }

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

  
  // EMAIL VERIFICATION

  /**
   * Handle email verification with token
   * POST /api/auth/email-verification
   */
  async handleEmailVerification(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the token from the request body
    const { token } = request.body as { token: string };

    // Validate input
    if (!token) {
      return reply.status(400).send({
        error: 'Verification token is required'
      });
    }

    // Make the call to the auth service to verify the email token
    const result = await authService.processEmailVerification(token);

    // If the email verification fails, build response and return the error
    if (!result.success) {
      const response: any = {
        error: result.error
      };

      if (result.action) {
        response.action = result.action;
        if (result.message) {
          response.message = result.message;
        }
      }

      return reply.status(result.statusCode).send(response);
    }

    return reply.status(result.statusCode).send({
      message: result.message
    });
  }


  /**
   * Resend email verification
   * POST /api/auth/resend-verification
   */
  async resendVerification(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the email from the request body
    const { email } = request.body as { email: string };

    // Validate input
    if (!email) {
      return reply.status(400).send({
        error: 'Email is required'
      });
    }

    // Validate email format here as well as in the service to optimize for performance and UX
    if (!authService.isValidEmail(email)) {
      return {
        success: false,
        statusCode: 400,
        error: 'Invalid email format'
      };
    }

    // Call the auth service to handle resend verification
    const result = await authService.resendEmailVerification(email);

    // If the resend verification fails, return the error
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    // If the resend verification succeeds, return the message
    return reply.status(result.statusCode).send({
      message: result.message
    });
  }


  // PASSWORD RESET

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };

    // Validate input
    if (!email) {
      return reply.status(400).send({
        error: 'Email is required'
      });
    }

    // Validate email format here as well as in the service to optimize for performance and UX
    if (!authService.isValidEmail(email)) {
      return reply.status(400).send({
        error: 'Invalid email format'
      });
    }

    const result = await authService.requestPasswordReset(email);

    if (!result.success) {
      return reply.status(500).send({
        error: 'Internal server error during password reset request'
      });
    }

    return reply.status(200).send({
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
      
      if (!token) {
        return reply.status(400).send({
          error: 'Password reset token is required'
        });
      }

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

      // If the password reset fails, return an error
      if (!result.success) {
        return reply.status(400).send({
          error: result.message
        });
      }

      // If the password reset succeeds, return the message
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


  // SECURITY QUESTIONS
  
  /**
   * Set up security questions for a user
   * POST /api/auth/security-questions
   */
  async setupSecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the questions from the request body
    const { questions } = request.body as {
      questions: Array<{ question: string; answer: string }>
    };

    // Check if request.user.id exists
    const user = (request as any).user;
    if (!user || !user.id) {
      return reply.status(401).send({error: 'Authentication required'});
    }

    // Call authService.setupSecurityQuestionsWithValidation
    const validation = await authService.validateSecurityQuestions(questions);

    // If the questions are not valid, return an error
    if (!validation.success) {
      return reply.status(validation.statusCode).send({error: validation.error});
    }

    // Convert user.id to number and call authService.setupSecurityQuestions
    const result = await authService.setupSecurityQuestions(user.id, questions);

    if (!result.success) {
      return reply.status(result.statusCode).send({error: result.error});
    }

    return reply.status(result.statusCode).send({
      message: result.message,
      questionsSet: questions.length
    });
  }


  /**
   * Get user's security questions (authenticated)
   * GET /api/auth/security-questions
   */
  async getSecurityQuestions(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get user ID from JWT token (assuming we have auth middleware)
      const user = (request as any).user;

      // if user is not authenticated, return an error
      if (!user || !user.id) {
        return reply.status(401).send({error: 'Authentication required'});
      }

      // Get security questions using the service
      const result = await authService.getUserSecurityQuestions(user.id);

      return reply.status(result.statusCode).send({
        message: result.message,
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
      // Retrieve the email from the request body
      const { email } = request.body as { email: string };

      // if email is not provided, return an error
      if (!email) { return reply.status(400).send({error: 'Email is required'}); }

      // Validate email format here as well as in the service to  optimize for performance and UX
      if (!authService.isValidEmail(email)) {
        return {
          success: false,
          statusCode: 400,
          error: 'Invalid email format'
        };
      }

      // Get recovery questions using the service
      const result = await authService.getRecoveryQuestions(email);

      // If the recovery questions fail, return an error
      if (!result.success) {
        return reply.status(result.statusCode || 500).send({
          error: result.error
        });
      }

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
    // Retrieve the email and answers from the request body
    const { email, answers } = request.body as {
      email: string;
      answers: Array<{ questionId: number; answer: string }>
    };

      // Validate email was provided
      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      // Validate answers were provided (at least 2 are required)
      if (!answers || !Array.isArray(answers) || answers.length < 2) {
        return reply.status(400).send({
          error: 'At least 2 answers are required'
        });
      }

      // Get client IP and User-Agent for security logging
      const clientIP = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || request.ip || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';

    // Call authService.verifySecurityQuestions with clientInfo
    const result = await authService.verifySecurityQuestions(email, answers, {
      ip: clientIP as string,
      userAgent: userAgent as string
    });

    // If the security questions are not verified, return an error
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    // If the security questions are verified, return the message and the reset token
    return reply.status(result.statusCode).send({
      message: result.message,
      verified: result.verified,
      resetToken: result.resetToken || null
    });
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


  // SECONDARY EMAIL

  /**
   * Set up secondary email for authenticated user
   * POST /api/auth/secondary-email
   */
  async setupSecondaryEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { secondaryEmail } = request.body as { secondaryEmail: string };

      // Get user ID from JWT token
      const user = (request as any).user;

      // if user is not authenticated, return an error
      if (!user || !user.id) {
        return reply.status(401).send({
          error: 'Authentication required'
        });
      }

      // if secondary email is not provided, return an error
      if (!secondaryEmail) {
        return reply.status(400).send({
          error: 'Secondary email is required'
        });
      }
      // Validate email format here as well as in the service to optimize for performance and UX
      if (!authService.isValidEmail(secondaryEmail)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Set up secondary email using the service
      const result = await authService.setupSecondaryEmail(user.id, secondaryEmail);

      // If the secondary email setup fails, return an error
      if (!result.success) {
        return reply.status(result.statusCode).send({
          error: result.error
        });
      }

      // If the secondary email setup succeeds, return the message
      return reply.status(result.statusCode).send({
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
      // Retrieve the token from the request body
      const { token } = request.body as { token: string };

      // if token is not provided, return an error
      if (!token) {
        return reply.status(400).send({
          error: 'Verification token is required'
        });
      }

      // Verify the token using the service
      const result = await authService.verifySecondaryEmail(token);

      // If the secondary email verification fails, return an error
      if (!result.success) {
        return reply.status(result.statusCode).send({
          error: result.error
        });
      }

      // If the secondary email verification succeeds, return the message
      return reply.status(result.statusCode).send({
        message: result.message
      });

    } catch (error) {
      console.error('Verify secondary email error:', error);
      return reply.status(500).send({
        error: 'Internal server error during secondary email verification'
      });
    }
  }


  /** Request password reset via secondary email
   * 
   * POST /api/auth/forgot-password-secondary
   */
  async forgotPasswordSecondary(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Retrieve the email from the request body
      const { email } = request.body as { email: string };

      // if email is not provided, return an error
      if (!email) {
        return reply.status(400).send({
          error: 'Email is required'
        });
      }

      // Validate email format here as well as in the service to optimize for performance and UX
      if (!authService.isValidEmail(email)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Request password reset using the service
      const result = await authService.requestPasswordResetSecondary(email);

      // If the password reset request fails, return an error
      if (!result.success) {
        return reply.status(result.statusCode).send({
          error: result.error
        });
      }

      // If the password reset request succeeds, return the message
      return reply.status(result.statusCode).send({
        message: result.message
      });

    } catch (error) {
      console.error('Secondary email password reset error:', error);
      return reply.status(500).send({
        error: 'Internal server error during password reset request'
      });
    }
  }


  // TOKEN REFRESH

  /** Refresh JWT tokens
   * 
   * POST /api/auth/refresh
   * 
   * when access token expires, use refresh token to get new valid access token
   * 
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    // Retrieve the refresh token from the request body
    const { refreshToken } = request.body as { refreshToken: string };

    // Validate input
    if (!refreshToken) {
      return reply.status(400).send({
        error: 'Refresh token is required'
      });
    }

    // Make the call to the JWT service to refresh the tokens
    const result = jwtService.refreshTokens(refreshToken);

    // If the token refresh fails, return the error
    if (!result.success) {
      return reply.status(result.statusCode).send({
        error: result.error
      });
    }

    // If the token refresh succeeds, return the new tokens
    return reply.status(result.statusCode).send({
      message: result.message,
      tokens: result.tokens
    });
  }

}

export const authController = new AuthController(); 