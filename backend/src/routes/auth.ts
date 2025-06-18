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
import { authCommonErrorResponses } from '../utils/errorSchemas.js';

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

const csrfTokenRateLimit = {
  max: 10, // 10 requests per minute for CSRF tokens
  timeWindow: 60 * 1000 // 1 minute
};

export default async function authRoutes(fastify: FastifyInstance) {
  // Register rate limiting plugin
  await fastify.register(import('@fastify/rate-limit'));

  // Using shared auth-specific error response schemas

  // GET /csrf-token - Get CSRF token for secure requests
  fastify.get('/csrf-token', {
    config: {
      rateLimit: csrfTokenRateLimit
    },
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            csrfToken: { type: 'string' }
          }
        },
        ...authCommonErrorResponses
      }
    }
  }, securityMiddleware.getCSRFToken());

  // POST /register - Create new user account
  fastify.post('/register', {
    config: {
      rateLimit: authRateLimit
    },
    schema: {
      ...registerSchema,
      response: {
        ...registerSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.register);

  // POST /login - Authenticate user and return tokens
  fastify.post('/login', {
    config: {
      rateLimit: authRateLimit
    },
    preHandler: [securityMiddleware.loginRateLimit()],
    schema: {
      ...loginSchema,
              response: {
          ...loginSchema.response,
          ...authCommonErrorResponses
        }
    }
  }, authController.login);

  // POST /verify-email - Verify user email with token
  fastify.post('/verify-email', {
    config: {
      rateLimit: authRateLimit
    },
    schema: {
      ...verifyEmailSchema,
              response: {
          ...verifyEmailSchema.response,
          ...authCommonErrorResponses
        }
    }
  }, authController.handleEmailVerification);

  // POST /refresh - Refresh access token
  fastify.post('/refresh', {
    config: {
      rateLimit: authRateLimit
    },
    schema: {
      ...refreshTokenSchema,
              response: {
          ...refreshTokenSchema.response,
          ...authCommonErrorResponses
        }
    }
  }, authController.refreshToken);

  // POST /resend-verification - Resend email verification
  fastify.post('/resend-verification', {
    config: {
      rateLimit: resendRateLimit
    },
    schema: {
      ...resendVerificationSchema,
      response: {
        ...resendVerificationSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.resendVerification);

  // POST /forgot-password - Request password reset
  fastify.post('/forgot-password', {
    config: {
      rateLimit: forgotPasswordRateLimit
    },
    preHandler: [securityMiddleware.passwordResetRateLimit()],
    schema: {
      ...forgotPasswordSchema,
      response: {
        ...forgotPasswordSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.forgotPassword);

  // GET /reset-password/:token - Verify password reset token
  fastify.get('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit
    },
    schema: {
      ...verifyResetTokenSchema,
      response: {
        ...verifyResetTokenSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.verifyPasswordReset);

  // POST /reset-password/:token - Complete password reset
  fastify.post('/reset-password/:token', {
    config: {
      rateLimit: resetPasswordRateLimit
    },
    schema: {
      ...resetPasswordSchema,
      response: {
        ...resetPasswordSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.resetPassword);

  // POST /security-questions - Setup security questions
  fastify.post('/security-questions', {
    config: {
      rateLimit: authRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...setupSecurityQuestionsSchema,
      response: {
        ...setupSecurityQuestionsSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.setupSecurityQuestions);

  // GET /security-questions - Get user's security questions
  fastify.get('/security-questions', {
    config: {
      rateLimit: authRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...getSecurityQuestionsSchema,
      response: {
        ...getSecurityQuestionsSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.getSecurityQuestions);

  // POST /recovery-questions - Get recovery questions for email
  fastify.post('/recovery-questions', {
    config: {
      rateLimit: forgotPasswordRateLimit
    },
    schema: {
      ...getRecoveryQuestionsSchema,
      response: {
        ...getRecoveryQuestionsSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.getRecoveryQuestions);

  // POST /verify-security-questions - Verify security questions for recovery
  fastify.post('/verify-security-questions', {
    config: {
      rateLimit: resetPasswordRateLimit
    },
    preHandler: [securityMiddleware.securityQuestionRateLimit()],
    schema: {
      ...verifySecurityQuestionsSchema,
      response: {
        ...verifySecurityQuestionsSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.verifySecurityQuestions);

  // GET /available-security-questions - Get available security question types
  fastify.get('/available-security-questions', {
    config: {
      rateLimit: authRateLimit
    },
    schema: {
      ...getAvailableSecurityQuestionsSchema,
      response: {
        ...getAvailableSecurityQuestionsSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.getAvailableSecurityQuestions);

  // POST /secondary-email - Setup secondary email
  fastify.post('/secondary-email', {
    config: {
      rateLimit: authRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...setupSecondaryEmailSchema,
      response: {
        ...setupSecondaryEmailSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.setupSecondaryEmail);

  // POST /verify-secondary-email - Verify secondary email
  fastify.post('/verify-secondary-email', {
    config: {
      rateLimit: authRateLimit
    },
    schema: {
      ...verifySecondaryEmailSchema,
      response: {
        ...verifySecondaryEmailSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.verifySecondaryEmail);

  // POST /forgot-password-secondary - Password reset via secondary email
  fastify.post('/forgot-password-secondary', {
    config: {
      rateLimit: forgotPasswordRateLimit
    },
    preHandler: [securityMiddleware.passwordResetRateLimit()],
    schema: {
      ...forgotPasswordSecondarySchema,
      response: {
        ...forgotPasswordSecondarySchema.response,
        ...authCommonErrorResponses
      }
    }
  }, authController.forgotPasswordSecondary);

  // GET /oauth/status - Get OAuth status
  fastify.get('/oauth/status', {
    config: {
      rateLimit: authRateLimit
    },
    preHandler: [requireAuth],
    schema: {
      ...oauthStatusSchema,
      response: {
        ...oauthStatusSchema.response,
        ...authCommonErrorResponses
      }
    }
  }, oauthController.getOAuthStatus);
} 
