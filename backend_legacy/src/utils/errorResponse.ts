/**
 * Standardized Error Response Utility
 * 
 * Provides consistent error response generation across all controllers
 * to match the error schemas defined in errorSchemas.ts
 */

interface ErrorResponseOptions {
  error: string;
  message?: string;
  statusCode: number;
  path?: string;
  details?: string[] | Record<string, any>;
  action?: string;
  code?: string;
  context?: {
    operation: string;
    resource?: string;
    resourceId?: string | number;
    userId?: number;
  };
}

/**
 * Standard error response interface
 */
export interface StandardErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: string[] | Record<string, any>;
  action?: string;
  code?: string;
  context?: {
    operation: string;
    resource?: string;
    resourceId?: string | number;
    userId?: number;
  };
}

/**
 * Standard success response interface
 */
export interface StandardSuccessResponse<T = any> {
  success: true;
  statusCode: number;
  message?: string;
  data?: T;
  timestamp?: string;
}

/**
 * Generate a standardized error response object
 */
export function createErrorResponse(options: ErrorResponseOptions): StandardErrorResponse {
  const timestamp = new Date().toISOString();
  const path = options.path || '/test-endpoint';
  
  return {
    success: false,
    error: options.error,
    message: options.message || options.error,
    statusCode: options.statusCode,
    timestamp,
    path,
    ...(options.details && { details: options.details }),
    ...(options.action && { action: options.action }),
    ...(options.code && { code: options.code }),
    ...(options.context && { context: options.context })
  };
}

/**
 * Generate an auth-specific error response (matches authErrorResponseSchema)
 */
export function createAuthErrorResponse(options: Partial<ErrorResponseOptions>) {
  return {
    error: options.error,
    ...(options.message && { message: options.message }),
    ...(options.action && { action: options.action }),
    ...(options.details && { details: options.details })
  };
}

/**
 * Error Response Builder class for fluent API
 */
export class ErrorResponseBuilder {
  private options: Partial<ErrorResponseOptions> = {};

  static create(): ErrorResponseBuilder {
    return new ErrorResponseBuilder();
  }

  status(statusCode: number): ErrorResponseBuilder {
    this.options.statusCode = statusCode;
    return this;
  }

  error(error: string): ErrorResponseBuilder {
    this.options.error = error;
    return this;
  }

  message(message: string): ErrorResponseBuilder {
    this.options.message = message;
    return this;
  }

  code(code: string): ErrorResponseBuilder {
    this.options.code = code;
    return this;
  }

  context(context: ErrorResponseOptions['context']): ErrorResponseBuilder {
    this.options.context = context;
    return this;
  }

  details(details: string[] | Record<string, any>): ErrorResponseBuilder {
    this.options.details = details;
    return this;
  }

  action(action: string): ErrorResponseBuilder {
    this.options.action = action;
    return this;
  }

  path(path: string): ErrorResponseBuilder {
    this.options.path = path;
    return this;
  }

  build(): StandardErrorResponse {
    if (!this.options.error || !this.options.statusCode) {
      throw new Error('Error and statusCode are required');
    }
    return createErrorResponse(this.options as ErrorResponseOptions);
  }
}

/**
 * Success Response Builder class for fluent API
 */
export class SuccessResponseBuilder<T = any> {
  private options: {
    statusCode?: number;
    message?: string;
    data?: T;
  } = {};

  static create<T = any>(): SuccessResponseBuilder<T> {
    return new SuccessResponseBuilder<T>();
  }

  status(statusCode: number): SuccessResponseBuilder<T> {
    this.options.statusCode = statusCode;
    return this;
  }

  message(message: string): SuccessResponseBuilder<T> {
    this.options.message = message;
    return this;
  }

  data(data: T): SuccessResponseBuilder<T> {
    this.options.data = data;
    return this;
  }

  build(): StandardSuccessResponse<T> {
    return {
      success: true,
      statusCode: this.options.statusCode || 200,
      message: this.options.message,
      data: this.options.data,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Common error response creators
 */
export const CommonErrors = {
  validation: (details: string[], field?: string): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(400)
      .error('Validation Error')
      .message('The provided data failed validation')
      .code('VALIDATION_FAILED')
      .details(details)
      .context({
        operation: 'validation',
        resource: field
      })
      .build(),

  unauthorized: (message: string = 'Authentication required'): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(401)
      .error('Unauthorized')
      .message(message)
      .code('UNAUTHORIZED')
      .context({
        operation: 'authentication'
      })
      .build(),

  forbidden: (resource?: string): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(403)
      .error('Forbidden')
      .message(`Access denied${resource ? ` to ${resource}` : ''}`)
      .code('FORBIDDEN')
      .context({
        operation: 'access_check',
        resource
      })
      .build(),

  notFound: (resource: string, id?: string | number): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(404)
      .error('Not Found')
      .message(`${resource} not found`)
      .code('NOT_FOUND')
      .context({
        operation: 'find',
        resource,
        resourceId: id
      })
      .build(),

  conflict: (message: string, code?: string): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(409)
      .error('Conflict')
      .message(message)
      .code(code || 'CONFLICT')
      .build(),

  internalServerError: (message: string = 'Internal server error'): StandardErrorResponse =>
    ErrorResponseBuilder.create()
      .status(500)
      .error('Internal Server Error')
      .message(message)
      .code('INTERNAL_ERROR')
      .context({
        operation: 'server_error'
      })
      .build()
};

/**
 * Common error response creators for different status codes
 */
export const ErrorResponses = {
  badRequest: (error: string, details?: string[]) => 
    createErrorResponse({ error, statusCode: 400, details }),
  
  unauthorized: (error: string = 'Unauthorized') => 
    createErrorResponse({ error, statusCode: 401 }),
  
  forbidden: (error: string = 'Forbidden') => 
    createErrorResponse({ error, statusCode: 403 }),
  
  notFound: (error: string = 'Not found') => 
    createErrorResponse({ error, statusCode: 404 }),
  
  conflict: (error: string, action?: string, message?: string) => 
    createErrorResponse({ error, statusCode: 409, action, message }),
  
  payloadTooLarge: (error: string = 'Payload too large') => 
    createErrorResponse({ error, statusCode: 413 }),
  
  unsupportedMediaType: (error: string = 'Unsupported media type') => 
    createErrorResponse({ error, statusCode: 415 }),
  
  tooManyRequests: (error: string = 'Too many requests') => 
    createErrorResponse({ error, statusCode: 429 }),
  
  internalServerError: (error: string = 'Internal server error') => 
    createErrorResponse({ error, statusCode: 500 })
};

/**
 * Auth-specific error response creators
 */
export const AuthErrorResponses = {
  badRequest: (error: string, details?: string[]) => 
    createAuthErrorResponse({ error, details }),
  
  unauthorized: (error: string = 'Unauthorized') => 
    createAuthErrorResponse({ error }),
  
  conflict: (error: string, action?: string, message?: string) => 
    createAuthErrorResponse({ error, action, message })
}; 