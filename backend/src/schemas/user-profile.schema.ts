/**
 * User Profile API Schemas (TypeBox Pilot Implementation)
 * 
 * This file demonstrates the TypeBox pilot for JSON schema generation with automatic TypeScript types.
 * TypeBox provides type-safe schema definitions with automatic TypeScript type generation,
 * eliminating the need for duplicate type definitions.
 * 
 * See backend/docs/PILOT_FEATURES.md for full documentation of this pilot implementation.
 */

import { Type, Static } from '@sinclair/typebox';

// ===============================================================================
// TYPEBOX PILOT DEMONSTRATION
// ===============================================================================

/**
 * TypeBox provides several key advantages over manual JSON Schema objects:
 * 
 * 1. TYPE SAFETY: Automatic TypeScript type generation from schemas
 * 2. DRY PRINCIPLE: Single source of truth for validation and types
 * 3. DEVELOPER EXPERIENCE: IntelliSense, autocompletion, compile-time validation
 * 4. MAINTAINABILITY: Schema changes automatically propagate to types
 * 
 * Compare this to the existing pattern where we manually maintain both
 * JSON schema objects AND separate TypeScript interfaces.
 */

// ===============================================================================
// BASE FIELD DEFINITIONS WITH TYPEBOX
// ===============================================================================

/**
 * Individual field schemas with validation rules.
 * TypeBox syntax is more declarative and self-documenting than plain JSON.
 */
const UserProfileFields = {
  // Required fields
  name: Type.String({
    minLength: 1,
    maxLength: 100,
    description: 'User full name'
  }),
  
  email: Type.String({
    format: 'email',
    maxLength: 255,
    description: 'Primary email address'
  }),

  // Optional fields that can be null or string
  secondaryEmail: Type.Optional(Type.Union([
    Type.String({
      format: 'email',
      maxLength: 255,
      description: 'Secondary email address'
    }),
    Type.Null()
  ])),

  resumeLink: Type.Optional(Type.Union([
    Type.String({
      format: 'uri',
      maxLength: 500,
      description: 'URL to user resume/CV'
    }),
    Type.Null()
  ])),

  githubLink: Type.Optional(Type.Union([
    Type.String({
      format: 'uri',
      pattern: '^https?://(www\\.)?github\\.com/.+$',
      maxLength: 500,
      description: 'GitHub profile URL'
    }),
    Type.Null()
  ])),

  linkedinLink: Type.Optional(Type.Union([
    Type.String({
      format: 'uri',
      pattern: '^https?://(www\\.)?linkedin\\.com/.+$',
      maxLength: 500,
      description: 'LinkedIn profile URL'
    }),
    Type.Null()
  ]))
};

// ===============================================================================
// RESPONSE SCHEMAS WITH AUTOMATIC TYPE GENERATION
// ===============================================================================

/**
 * User profile response schema (what we return from GET /api/user)
 * 
 * TypeBox automatically generates the corresponding TypeScript type.
 * No need to manually maintain a separate interface!
 */
const UserProfileResponseSchema = Type.Object({
  id: Type.Number({ description: 'User ID' }),
  name: UserProfileFields.name,
  email: UserProfileFields.email,
  secondaryEmail: UserProfileFields.secondaryEmail,
  resumeLink: UserProfileFields.resumeLink,
  githubLink: UserProfileFields.githubLink,
  linkedinLink: UserProfileFields.linkedinLink,
  role: Type.String({ description: 'User role' }),
  emailVerified: Type.Boolean({ description: 'Primary email verification status' }),
  secondaryEmailVerified: Type.Boolean({ description: 'Secondary email verification status' }),
  provider: Type.String({ description: 'Authentication provider' }),
  createdAt: Type.String({ format: 'date-time', description: 'Account creation timestamp' }),
  updatedAt: Type.String({ format: 'date-time', description: 'Last update timestamp' })
}, {
  additionalProperties: false,
  description: 'User profile information'
});

/**
 * User profile update request schema (what we accept in PUT /api/user)
 * 
 * Notice how we can reuse the field definitions from above.
 * This promotes consistency and reduces duplication.
 */
const UserProfileUpdateRequestSchema = Type.Object({
  name: Type.Optional(UserProfileFields.name),
  secondaryEmail: UserProfileFields.secondaryEmail, // Already optional
  resumeLink: UserProfileFields.resumeLink,         // Already optional
  githubLink: UserProfileFields.githubLink,         // Already optional
  linkedinLink: UserProfileFields.linkedinLink     // Already optional
}, {
  additionalProperties: false,
  minProperties: 1,
  description: 'User profile update data (at least one field required)'
});

/**
 * Standard error response schema (consistent with global error handler)
 */
const ErrorResponseSchema = Type.Object({
  error: Type.String({ description: 'Error type' }),
  message: Type.String({ description: 'Error message' }),
  statusCode: Type.Number({ description: 'HTTP status code' }),
  timestamp: Type.String({ format: 'date-time', description: 'Error timestamp' }),
  path: Type.Optional(Type.String({ description: 'Request path' })),
  details: Type.Optional(Type.Any({ description: 'Additional error details' }))
}, {
  additionalProperties: false,
  description: 'Standard error response format'
});

// ===============================================================================
// FASTIFY ROUTE SCHEMAS
// ===============================================================================

/**
 * GET /api/user schema
 * Retrieve user profile information
 */
export const getUserProfileSchema = {
  tags: ['User Profile'],
  summary: 'Get user profile',
  description: 'Retrieve the authenticated user\'s profile information',
  response: {
    200: UserProfileResponseSchema,
    401: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema
  }
};

/**
 * PUT /api/user schema
 * Update user profile information
 */
export const updateUserProfileSchema = {
  tags: ['User Profile'],
  summary: 'Update user profile',
  description: 'Update the authenticated user\'s profile information',
  body: UserProfileUpdateRequestSchema,
  response: {
    200: UserProfileResponseSchema,
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    404: ErrorResponseSchema,
    409: ErrorResponseSchema, // For conflicts like duplicate secondary email
    500: ErrorResponseSchema
  }
};

// ===============================================================================
// AUTOMATIC TYPESCRIPT TYPE GENERATION
// ===============================================================================

/**
 * MAGIC HAPPENS HERE! 🪄
 * 
 * TypeBox automatically generates TypeScript types from our schemas.
 * These types are completely in sync with the validation schemas above.
 * 
 * Compare this to the existing pattern where we have to manually maintain
 * both JSON schemas AND separate TypeScript interfaces, keeping them in sync manually.
 */
export type UserProfileResponse = Static<typeof UserProfileResponseSchema>;
export type UserProfileUpdateRequest = Static<typeof UserProfileUpdateRequestSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

/**
 * Example of what the generated types look like:
 * 
 * type UserProfileResponse = {
 *   id: number;
 *   name: string;
 *   email: string;
 *   secondaryEmail?: string | null;
 *   resumeLink?: string | null;
 *   githubLink?: string | null;
 *   linkedinLink?: string | null;
 *   role: string;
 *   emailVerified: boolean;
 *   secondaryEmailVerified: boolean;
 *   provider: string;
 *   createdAt: string;
 *   updatedAt: string;
 * }
 * 
 * This is automatically generated and always stays in sync with the schema!
 */

// ===============================================================================
// VALIDATION HELPER FUNCTIONS
// ===============================================================================

/**
 * Validation helper functions (following existing patterns)
 * These complement the schema validation with additional business logic checks.
 */
export const userProfileValidation = {
  /**
   * Validate GitHub URL format
   */
  isValidGithubUrl: (url: string): boolean => {
    if (!url) return true; // Allow null/empty
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/.+$/;
    return githubPattern.test(url);
  },

  /**
   * Validate LinkedIn URL format
   */
  isValidLinkedinUrl: (url: string): boolean => {
    if (!url) return true; // Allow null/empty
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/.+$/;
    return linkedinPattern.test(url);
  },

  /**
   * Validate email format (more comprehensive than basic format check)
   */
  isValidEmail: (email: string): boolean => {
    if (!email) return true; // Allow null/empty
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email) && email.length <= 255;
  },

  /**
   * Validate URL format
   */
  isValidUrl: (url: string): boolean => {
    if (!url) return true; // Allow null/empty
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Sanitize profile update data
   * Ensures data is clean before validation
   */
  sanitizeUpdateData: (data: any): Partial<UserProfileUpdateRequest> => {
    const sanitized: any = {};
    
    if (data.name !== undefined) {
      sanitized.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    }
    
    if (data.secondaryEmail !== undefined) {
      sanitized.secondaryEmail = data.secondaryEmail === null ? null : 
        (typeof data.secondaryEmail === 'string' ? data.secondaryEmail.trim().toLowerCase() : data.secondaryEmail);
    }
    
    if (data.resumeLink !== undefined) {
      sanitized.resumeLink = data.resumeLink === null ? null :
        (typeof data.resumeLink === 'string' ? data.resumeLink.trim() : data.resumeLink);
    }
    
    if (data.githubLink !== undefined) {
      sanitized.githubLink = data.githubLink === null ? null :
        (typeof data.githubLink === 'string' ? data.githubLink.trim() : data.githubLink);
    }
    
    if (data.linkedinLink !== undefined) {
      sanitized.linkedinLink = data.linkedinLink === null ? null :
        (typeof data.linkedinLink === 'string' ? data.linkedinLink.trim() : data.linkedinLink);
    }
    
    return sanitized;
  }
};

// ===============================================================================
// EXPORTS FOR FASTIFY INTEGRATION
// ===============================================================================

/**
 * Export the raw schemas for Fastify validation
 * TypeBox schemas are compatible with Fastify's JSON Schema validation
 */
export { 
  UserProfileResponseSchema, 
  UserProfileUpdateRequestSchema, 
  ErrorResponseSchema,
  UserProfileFields
};

/**
 * PILOT EVALUATION NOTES:
 * 
 * ✅ BENEFITS OBSERVED:
 * - Single source of truth for schemas and types
 * - Better developer experience with IntelliSense
 * - More readable and declarative schema definitions
 * - Automatic type safety without manual maintenance
 * 
 * 🔍 AREAS TO MONITOR:
 * - Integration with existing Fastify patterns
 * - Performance impact (if any)
 * - Team adoption and learning curve
 * - Build time impact
 * 
 * 📝 RECOMMENDATION:
 * If this pilot proves successful, consider migrating other schema files
 * to TypeBox for consistency and improved developer experience.
 */ 