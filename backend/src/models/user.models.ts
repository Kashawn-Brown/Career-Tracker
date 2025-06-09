/**
 * User Models
 * 
 * Type definitions for user-related entities and enums.
 */

/**
 * User Role enum for authorization system
 */
export enum UserRole {
  USER = 'USER',           // Regular user (default)
  PREMIUM = 'PREMIUM',     // Premium subscriber
  ADMIN = 'ADMIN',         // System administrator  
  MODERATOR = 'MODERATOR'  // Content moderator
}

/**
 * User role type for TypeScript
 */
export type UserRoleType = keyof typeof UserRole; 