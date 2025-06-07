/**
 * Authentication API Schemas
 * 
 * Defines JSON schemas for authentication REST API endpoints.
 * These schemas are used by Fastify for request/response validation and automatic OpenAPI documentation.
 */

// Base user response schema (without sensitive data)
const userResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    emailVerified: { type: 'boolean' },
    provider: { type: 'string', enum: ['LOCAL', 'GOOGLE', 'LINKEDIN', 'GITHUB'] },
    providerId: { type: ['string', 'null'] },
    resumeLink: { type: ['string', 'null'] },
    githubLink: { type: ['string', 'null'] },
    linkedinLink: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

// Token pair response schema
const tokenPairSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' }
  }
};

// Schema for user registration
export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      name: { type: 'string', minLength: 1, maxLength: 100 }
    },
    additionalProperties: false
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: userResponseSchema,
        tokens: tokenPairSchema
      }
    }
  }
};

// Schema for user login
export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: userResponseSchema,
        tokens: tokenPairSchema
      }
    }
  }
};

// Schema for email verification
export const verifyEmailSchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 1 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

// Schema for token refresh
export const refreshTokenSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', minLength: 1 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tokens: tokenPairSchema
      }
    }
  }
};

// Schema for resending email verification
export const resendVerificationSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};

// Schema for OAuth provider status
export const oauthStatusSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        providers: {
          type: 'object',
          properties: {
            google: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                configured: { type: 'boolean' }
              }
            },
            linkedin: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                configured: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
};

// Common error response schema for all authentication API endpoints
export const authErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: ['string', 'undefined'] },
    action: { type: ['string', 'undefined'] },
    details: {
      type: 'array',
      items: { type: 'string' }
    }
  }
}; 