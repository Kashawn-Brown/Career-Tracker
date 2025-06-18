/**
 * Global Error Handling Middleware
 * 
 * Provides centralized error handling with consistent error response format.
 * Handles validation errors, Prisma database errors, and custom business logic errors.
 * Includes proper logging and security considerations.
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: any;
}

/**
 * Custom error class for business logic errors
 */
export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: any,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Global error handler middleware
 */
export async function globalErrorHandler(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error for debugging
  request.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: request.body,
    query: request.query,
    params: request.params
  }, 'Request error');

  // Prepare base error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: request.url
  };

  // Handle Fastify validation errors
  if (error.validation) {
    errorResponse.error = 'Validation Error';
    errorResponse.message = 'Request validation failed';
    errorResponse.statusCode = 400;
    errorResponse.details = error.validation.map((v: any) => ({
      field: v.instancePath || v.schemaPath,
      message: v.message
    }));
    
    return reply.status(400).send(errorResponse);
  }

  // Handle custom business logic errors
  if (error instanceof BusinessLogicError) {
    errorResponse.error = 'Business Logic Error';
    errorResponse.message = error.message;
    errorResponse.statusCode = error.statusCode;
    
    return reply.status(error.statusCode).send(errorResponse);
  }

  // Handle custom validation errors
  if (error instanceof ValidationError) {
    errorResponse.error = 'Validation Error';
    errorResponse.message = error.message;
    errorResponse.statusCode = error.statusCode;
    errorResponse.details = error.details;
    
    return reply.status(error.statusCode).send(errorResponse);
  }

  // Handle Prisma database errors
  if (error instanceof PrismaClientKnownRequestError) {
    errorResponse.statusCode = 400;
    
    switch (error.code) {
      case 'P2002':
        errorResponse.error = 'Conflict';
        errorResponse.message = 'A record with this data already exists';
        errorResponse.statusCode = 409;
        break;
      case 'P2025':
        errorResponse.error = 'Not Found';
        errorResponse.message = 'The requested record was not found';
        errorResponse.statusCode = 404;
        break;
      case 'P2003':
        errorResponse.error = 'Foreign Key Constraint';
        errorResponse.message = 'Invalid reference to related record';
        break;
      case 'P2006':
        errorResponse.error = 'Invalid Data';
        errorResponse.message = 'The provided value is invalid for this field';
        break;
      default:
        errorResponse.error = 'Database Error';
        errorResponse.message = 'Database operation failed';
        break;
    }
    
    return reply.status(errorResponse.statusCode).send(errorResponse);
  }

  // Handle Prisma validation errors
  if (error instanceof PrismaClientValidationError) {
    errorResponse.error = 'Database Validation Error';
    errorResponse.message = 'Invalid data provided to database';
    errorResponse.statusCode = 400;
    
    return reply.status(400).send(errorResponse);
  }

  // Handle HTTP errors (with status codes)
  if (error.statusCode) {
    errorResponse.statusCode = error.statusCode;
    
    switch (error.statusCode) {
      case 400:
        errorResponse.error = 'Bad Request';
        errorResponse.message = error.message || 'Invalid request';
        break;
      case 401:
        errorResponse.error = 'Unauthorized';
        errorResponse.message = error.message || 'Authentication required';
        break;
      case 403:
        errorResponse.error = 'Forbidden';
        errorResponse.message = error.message || 'Access denied';
        break;
      case 404:
        errorResponse.error = 'Not Found';
        errorResponse.message = error.message || 'Resource not found';
        break;
      case 429:
        errorResponse.error = 'Too Many Requests';
        errorResponse.message = error.message || 'Rate limit exceeded';
        break;
      default:
        errorResponse.error = 'HTTP Error';
        errorResponse.message = error.message || 'Request failed';
        break;
    }
    
    return reply.status(error.statusCode).send(errorResponse);
  }

  // Handle generic errors (fallback)
  // Don't expose internal error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    errorResponse.message = error.message || 'An unexpected error occurred';
    errorResponse.details = {
      name: error.name,
      stack: error.stack
    };
  }

  return reply.status(500).send(errorResponse);
}

/**
 * Helper function to create business logic errors
 */
export function createBusinessError(message: string, statusCode: number = 400, code?: string): BusinessLogicError {
  return new BusinessLogicError(message, statusCode, code);
}

/**
 * Helper function to create validation errors
 */
export function createValidationError(message: string, details?: any, statusCode: number = 400): ValidationError {
  return new ValidationError(message, details, statusCode);
}

/**
 * Helper function to check if an error is a custom error type
 */
export function isCustomError(error: any): boolean {
  return error instanceof BusinessLogicError || error instanceof ValidationError;
} 