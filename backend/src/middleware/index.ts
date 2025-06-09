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