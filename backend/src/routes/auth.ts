/**
 * Authentication Routes
 * 
 * Defines all authentication-related endpoints including:
 * - User registration and login
 * - Email verification
 * - Token refresh
 * - OAuth flows
 * 
 * Includes rate limiting and request validation.
 */

import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller.js';
import { oauthController } from '../controllers/oauth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { securityMiddleware } from '../middleware/security.middleware.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  oauthStatusSchema,
  setupSecurityQuestionsSchema,
  getSecurityQuestionsSchema,
  getRecoveryQuestionsSchema,
  verifySecurityQuestionsSchema,
  getAvailableSecurityQuestionsSchema,
  setupSecondaryEmailSchema,
  verifySecondaryEmailSchema,
  forgotPasswordSecondarySchema
} from '../schemas/auth.schema.js';

// Rate limiting configuration
/*
per-IP address limit by default in Fastify's rate limiting plugin.
Each unique IP address can make 5 requests per minute to endpoints using authRateLimit. 
So if 100 different users hit the endpoint simultaneously, each can make 5 requests within their minute window 
- it's not shared globally across all users.
*/
const authRateLimit = {
  max: 5, // 5 requests per minute
  timeWindow: 60 * 1000 // 1 minute
};

const resendRateLimit = {
  max: 3, // 3 requests per 5 minutes for resend
  timeWindow: 5 * 60 * 1000 // 5 minutes
};

const forgotPasswordRateLimit = {
  max: 3, // 3 requests per hour for password reset
  timeWindow: 60 * 60 * 1000 // 1 hour
};

const resetPasswordRateLimit = {
  max: 10, // 10 attempts per 15 minutes for password reset completion
  timeWindow: 15 * 60 * 1000 // 15 minutes
};

export default async function authRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // CSRF Token endpoint
  fastify.get('/csrf-token', {
    config: {
      rateLimit: {
        max: 10, // 10 requests per minute for CSRF tokens
        timeWindow: 60 * 1000
      }
    }
  }, securityMiddleware.getCSRFToken());

  /* ROUTES */

  // User Registration
  fastify.post('/register', {
    config: {
      rateLimit: authRateLimit
    },
    schema: registerSchema
  }, authController.register.bind(authController));


  // User Login
  fastify.post('/login', {
    config: {
      rateLimit: authRateLimit
    },
    schema: loginSchema,
    preHandler: [securityMiddleware.loginRateLimit()]
  }, authController.login.bind(authController));


  // Email Verification - user clicks link in verification email
  fastify.post('/verify-email', {
    config: {
      rateLimit: authRateLimit
    },
    schema: verifyEmailSchema
  }, authController.handleEmailVerification.bind(authController));


  // Token Refresh - used when access token expires
  fastify.post('/refresh', {
    config: {
      rateLimit: authRateLimit
    },
    schema: refreshTokenSchema
  }, authController.refreshToken.bind(authController));


  // Resend Email Verification - used when user doesn't receive verification email
  fastify.post('/resend-verification', {
    config: {
      rateLimit: resendRateLimit // Stricter rate limit for resend
    },
    schema: resendVerificationSchema
  }, authController.resendVerification.bind(authController));


  // Forgot Password
  fastify.post('/forgot-password', {
    config: {
      rateLimit: forgotPasswordRateLimit // 3 requests per hour
    },
    schema: forgotPasswordSchema,
    preHandler: [securityMiddleware.passwordResetRateLimit()]
  }, authController.forgotPassword.bind(authController));


  // Verify Password Reset Token - used when user clicks link in password reset email
  fastify.get('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit // 10 attempts per 15 minutes
    },
    schema: verifyResetTokenSchema
  }, authController.verifyPasswordReset.bind(authController));


  // Complete Password Reset - used when user enters new password
  fastify.post('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit // 10 attempts per 15 minutes
    },
    schema: resetPasswordSchema
  }, authController.resetPassword.bind(authController));


  /* Security Questions Routes */
  
  // Set up security questions (authenticated)
  fastify.post('/security-questions', {
    config: {
      rateLimit: authRateLimit // 5 requests per minute
    },
    schema: setupSecurityQuestionsSchema,
    preHandler: requireAuth
  }, authController.setupSecurityQuestions.bind(authController));

  // Get user's security questions (authenticated)
  fastify.get('/security-questions', {
    config: {
      rateLimit: authRateLimit // 5 requests per minute
    },
    schema: getSecurityQuestionsSchema,
    preHandler: requireAuth
  }, authController.getSecurityQuestions.bind(authController));

  // Get recovery questions for email (public)
  // when user clicks forgot password (chooses to answer security questions)
  fastify.post('/recovery-questions', {
    config: {
      rateLimit: forgotPasswordRateLimit // 3 requests per hour like forgot password
    },
    schema: getRecoveryQuestionsSchema
  }, authController.getRecoveryQuestions.bind(authController));

  // Verify security questions for recovery (public)
  fastify.post('/verify-security-questions', {
    config: {
      rateLimit: resetPasswordRateLimit // 10 attempts per 15 minutes
    },
    schema: verifySecurityQuestionsSchema,
    preHandler: [securityMiddleware.securityQuestionRateLimit()]
  }, authController.verifySecurityQuestions.bind(authController));

  // Get available security question types (public)
  fastify.get('/available-security-questions', {
    config: {
      rateLimit: authRateLimit // 5 requests per minute (light rate limit for public endpoint)
    },
    schema: getAvailableSecurityQuestionsSchema
  }, authController.getAvailableSecurityQuestions.bind(authController));


  /* Secondary Email Management Routes */
  
  // Set up secondary email (authenticated)
  fastify.post('/secondary-email', {
    config: {
      rateLimit: authRateLimit // 5 requests per minute
    },
    schema: setupSecondaryEmailSchema,
    preHandler: requireAuth
  }, authController.setupSecondaryEmail.bind(authController));

  
  // Verify secondary email token (public)
  fastify.post('/verify-secondary-email', {
    config: {
      rateLimit: authRateLimit // 5 requests per minute
    },
    schema: verifySecondaryEmailSchema
  }, authController.verifySecondaryEmail.bind(authController));


  // Forgot password via secondary email (public)
  fastify.post('/forgot-password-secondary', {
    config: {
      rateLimit: forgotPasswordRateLimit // 3 requests per hour like forgot password
    },
    schema: forgotPasswordSecondarySchema,
    preHandler: [securityMiddleware.passwordResetRateLimit()]
  }, authController.forgotPasswordSecondary.bind(authController));

  
  /* OAuth Routes */
  
  // Google OAuth - Initiate
  fastify.get('/google', oauthController.googleAuth.bind(oauthController));
  

  // Google OAuth - Callback
  fastify.get('/callback/google', oauthController.googleCallback.bind(oauthController));
  

  // LinkedIn OAuth - Initiate
  fastify.get('/linkedin', oauthController.linkedinAuth.bind(oauthController));
  

  // LinkedIn OAuth - Callback
  fastify.get('/callback/linkedin', oauthController.linkedinCallback.bind(oauthController));
  

  // OAuth Provider Status
  fastify.get('/oauth/status', {
    schema: oauthStatusSchema
  }, oauthController.getOAuthStatus.bind(oauthController));
} 