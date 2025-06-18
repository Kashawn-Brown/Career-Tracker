/**
 * Common Error Response Schemas
 * 
 * Shared error response schemas used across all route files for consistent
 * API error handling and documentation.
 */

// Standard error response schema structure
export const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
    timestamp: { type: 'string' },
    path: { type: 'string' }
  },
  required: ['success', 'error', 'message', 'statusCode', 'timestamp', 'path']
};

// Auth-specific error response schema
export const authErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    action: { type: 'string' },
    details: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

// Common error responses used across all route files
export const commonErrorResponses = {
  400: errorResponseSchema,
  401: errorResponseSchema, 
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  413: errorResponseSchema,
  415: errorResponseSchema,
  429: errorResponseSchema,
  500: errorResponseSchema
};

// Auth-specific common error responses
export const authCommonErrorResponses = {
  400: authErrorResponseSchema,
  401: authErrorResponseSchema,
  403: authErrorResponseSchema,
  429: authErrorResponseSchema,
  500: authErrorResponseSchema
};

// File upload specific error responses (includes file-specific codes)
export const fileUploadErrorResponses = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  413: errorResponseSchema, // Payload too large
  415: errorResponseSchema, // Unsupported media type
  429: errorResponseSchema,
  500: errorResponseSchema
}; 