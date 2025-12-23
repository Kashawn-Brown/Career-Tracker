/**
 * Middleware Index
 * 
 * Central export point for all middleware functions.
 */

export {
  requireAuth,
  extractUser,
  roleBasedAccess
} from './auth.middleware.js';

export {
  globalErrorHandler,
  BusinessLogicError,
  ValidationError,
  createBusinessError,
  createValidationError,
  isCustomError,
  type ErrorResponse
} from './error.middleware.js';

export {
  uploadSingle,
  uploadMultiple,
  cleanupFile,
  getFileInfo
} from './upload.middleware.js'; 