/**
 * Authentication Controller
 * 
 * Handles all authentication endpoints including registration, login,
 * email verification, token refresh, and logout.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/index.js';
import { userRepository } from '../repositories/index.js';
import { UserRole } from '../models/user.models.js';
import { queueService } from '../services/queue.service.js';

export class AuthController {
  /**
   * Register a new user with email and password
   * POST /api/auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password, name } = request.body as {
        email: string;
        password: string;
        name: string;
      };

      // Validate input
      if (!email || !password || !name) {
        return reply.status(400).send({
          error: 'Missing required fields: email, password, name'
        });
      }

      // Validate email format
      if (!authService.isValidEmail(email)) {
        return reply.status(400).send({
          error: 'Invalid email format'
        });
      }

      // Validate password strength
      const passwordValidation = authService.isValidPassword(password);
      if (!passwordValidation.valid) {
        return reply.status(400).send({
          error: 'Password validation failed',
          details: passwordValidation.errors
        });
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        // If user exists but hasn't verified email, offer to resend verification
        if (!existingUser.emailVerified) {
          return reply.status(409).send({
            error: 'You have already registered with this email but haven\'t verified it yet.',
            action: 'resend_verification',
            message: 'Would you like to resend the verification email?'
          });
        }
        
        return reply.status(409).send({
          error: 'User with this email already exists and is verified'
        });
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(password);

      // Create user
      const user = await userRepository.create({
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        provider: 'LOCAL',
        providerId: null
      });

      // Generate and store email verification token
      const verificationToken = authService.generateEmailVerificationToken();
      await authService.storeEmailVerificationToken(user.id, verificationToken);

      // Send verification email via queue (instant response!)
      try {
        if (queueService.isReady()) {
          await queueService.addEmailVerificationJob({
            to: email,
            userName: name,
            verificationToken,
            verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
          });
          console.log(`Email verification job queued for: ${email}`);
        } else {
          console.warn(`Queue service not available. Email verification token for ${email}: ${verificationToken}`);
        }
      } catch (emailError) {
        console.error('Failed to queue verification email:', emailError);
        // Don't fail registration if email queueing fails
      }

      // Generate JWT tokens with user role
      const tokens = authService.generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return reply.status(201).send({
        message: 'User registered successfully. Please check your email for verification.',
        user: userResponse,
        tokens
      });

    } catch (error) {
      console.error('Registration error:', error);
      return reply.status(500).send({
        error: 'Internal server error during registration'
      });
    }
  }

  /**
   * Login with email and password
   * POST /api/auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      // Validate input
      if (!email || !password) {
        return reply.status(400).send({
          error: 'Email and password are required'
        });
      }

      // Find user
      const user = await userRepository.findByEmail(email);
      if (!user) {
        return reply.status(401).send({
          error: 'Invalid credentials'
        });
      }

      // Check if user has a password (OAuth users don't)
      if (!user.password) {
        return reply.status(401).send({
          error: 'This account uses OAuth login. Please use Google or LinkedIn to sign in.'
        });
      }

      // Verify password
      const isPasswordValid = await authService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return reply.status(401).send({
          error: 'Invalid credentials'
        });
      }

      // Generate JWT tokens with user role
      const tokens = authService.generateTokenPair(user.id, user.email, user.role as UserRole);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      return reply.send({
        message: 'Login successful',
        user: userResponse,
        tokens
      });

    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({
        error: 'Internal server error during login'
      });
    }
  }

  /**
   * Verify email with token
   * POST /api/auth/verify-email
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.body as { token: string };

      if (!token) {
        return reply.status(400).send({
          error: 'Verification token is required'
        });
      }

      // Verify the token using the service
      const result = await authService.verifyEmailToken(token);

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


}

export const authController = new AuthController(); 