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
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  oauthStatusSchema
} from '../schemas/auth.schema.js';

// Rate limiting configuration
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
    schema: loginSchema
  }, authController.login.bind(authController));

  // Email Verification
  fastify.post('/verify-email', {
    config: {
      rateLimit: authRateLimit
    },
    schema: verifyEmailSchema
  }, authController.verifyEmail.bind(authController));

  // Token Refresh
  fastify.post('/refresh', {
    config: {
      rateLimit: authRateLimit
    },
    schema: refreshTokenSchema
  }, authController.refreshToken.bind(authController));

  // Resend Email Verification
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
    schema: forgotPasswordSchema
  }, authController.forgotPassword.bind(authController));

  // Verify Password Reset Token
  fastify.get('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit // 10 attempts per 15 minutes
    },
    schema: verifyResetTokenSchema
  }, authController.verifyPasswordReset.bind(authController));

  // Complete Password Reset
  fastify.post('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit // 10 attempts per 15 minutes
    },
    schema: resetPasswordSchema
  }, authController.resetPassword.bind(authController));

  // OAuth Routes
  
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