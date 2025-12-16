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

// Schema for forgot password request
export const forgotPasswordSchema = {
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

// Schema for verifying password reset token (GET endpoint)
export const verifyResetTokenSchema = {
  params: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 32, maxLength: 64 }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        valid: { type: 'boolean' }
      }
    }
  }
};

// Schema for password reset completion (POST endpoint)
export const resetPasswordSchema = {
  params: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string', minLength: 32, maxLength: 64 }
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['password'],
    properties: {
      password: { type: 'string', minLength: 8, maxLength: 128 }
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

// Security Question Types enum for schema validation
const securityQuestionTypes = [
  'FIRST_PET_NAME',
  'MOTHER_MAIDEN_NAME', 
  'FIRST_SCHOOL',
  'CHILDHOOD_FRIEND',
  'BIRTH_CITY',
  'FIRST_CAR',
  'FAVORITE_TEACHER',
  'FIRST_JOB',
  'CHILDHOOD_STREET',
  'FATHER_MIDDLE_NAME'
];

// Schema for setting up security questions
export const setupSecurityQuestionsSchema = {
  body: {
    type: 'object',
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          required: ['question', 'answer'],
          properties: {
            question: { 
              type: 'string', 
              enum: securityQuestionTypes 
            },
            answer: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 100 
            }
          },
          additionalProperties: false
        }
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        questionsSet: { type: 'integer' }
      }
    }
  }
};

// Schema for getting user's security questions (without answers)
export const getSecurityQuestionsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              question: { 
                type: 'string', 
                enum: securityQuestionTypes 
              },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }
};

// Schema for verifying security questions during recovery
export const verifySecurityQuestionsSchema = {
  body: {
    type: 'object',
    required: ['email', 'answers'],
    properties: {
      email: { type: 'string', format: 'email' },
      answers: {
        type: 'array',
        minItems: 2,
        maxItems: 5,
        items: {
          type: 'object',
          required: ['questionId', 'answer'],
          properties: {
            questionId: { type: 'integer' },
            answer: { 
              type: 'string', 
              minLength: 1, 
              maxLength: 100 
            }
          },
          additionalProperties: false
        }
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        verified: { type: 'boolean' },
        resetToken: { type: ['string', 'null'] }
      }
    }
  }
};

// Schema for getting recovery questions for a specific email
export const getRecoveryQuestionsSchema = {
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
        message: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              question: { 
                type: 'string', 
                enum: securityQuestionTypes 
              }
            }
          }
        }
      }
    }
  }
};

// Schema for getting available security question types with display text
export const getAvailableSecurityQuestionsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              text: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

export const setupSecondaryEmailSchema = {
  body: {
    type: 'object',
    required: ['secondaryEmail'],
    properties: {
      secondaryEmail: { 
        type: 'string',
        format: 'email',
        maxLength: 100
      }
    }
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

export const verifySecondaryEmailSchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { 
        type: 'string',
        minLength: 1,
        maxLength: 255
      }
    }
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

export const forgotPasswordSecondarySchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { 
        type: 'string',
        format: 'email',
        maxLength: 100
      }
    }
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