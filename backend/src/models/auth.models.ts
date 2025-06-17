/**
 * Authentication Models
 * 
 * Defines TypeScript interfaces and types for authentication-related entities.
 * These models represent the structure of authentication data used throughout the application.
 */

import { UserRole } from './user.models.js';
import { TokenPair } from './jwt.models.js';

// JWT types are now in jwt.models.ts to follow established patterns

/**
 * Authentication Provider enum
 * Used for OAuth and local authentication
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  LINKEDIN = 'LINKEDIN',
  GITHUB = 'GITHUB'
}

/**
 * OAuth Profile interface for OAuth provider data
 */
export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  provider: AuthProvider;
  photo?: string;
}

/**
 * Email Verification Result interface
 */
export interface EmailVerificationResult {
  success: boolean;
  message: string;
  action?: string;
}

/**
 * Resend Verification Result interface
 */
export interface ResendVerificationResult {
  success: boolean;
  message: string;
  token?: string;
}

/**
 * Password Validation Result interface
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * OAuth Provider Status interface
 */
export interface OAuthProviderStatus {
  enabled: boolean;
  configured: boolean;
}

/**
 * OAuth Status Response interface
 */
export interface OAuthStatusResponse {
  google: OAuthProviderStatus;
  linkedin: OAuthProviderStatus;
}

// ============================================================================
// AUTH SERVICE RESULT INTERFACES
// ============================================================================

/**
 * Register User Result interface
 */
export interface RegisterUserResult {
  success: boolean;
  statusCode: number;
  message?: string;
  user?: any;
  tokens?: TokenPair;
  error?: string;
  details?: string[];
  action?: string;
}

/**
 * Login User Result interface
 */
export interface LoginUserResult {
  success: boolean;
  statusCode: number;
  message?: string;
  user?: any;
  tokens?: TokenPair;
  error?: string;
}

/**
 * Initiate Password Reset Result interface
 */
export interface InitiatePasswordResetResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
}

/**
 * Request Password Reset Result interface
 */
export interface RequestPasswordResetResult {
  success: boolean;
  message: string;
  token?: string;
}

/**
 * Reset Password Result interface
 */
export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

/**
 * Process Email Verification Result interface
 */
export interface ProcessEmailVerificationResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  action?: string;
}

/**
 * Resend Email Verification Result interface
 */
export interface ResendEmailVerificationResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  token?: string;
}

/**
 * Setup Security Questions Result interface
 */
export interface SetupSecurityQuestionsResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  questionsSet?: number;
}

/**
 * Get User Security Questions Result interface
 */
export interface GetUserSecurityQuestionsResult {
  success: boolean;
  statusCode: number;
  message?: string;
  questions?: Array<{ id: number; question: string; createdAt: Date }>
}

/**
 * Get User Recovery Questions Result interface
 */
export interface GetUserRecoveryQuestionsResult {
  success: boolean;
  statusCode?: number;
  message?: string;
  error?: string;
  questions?: Array<{ id: number; question: string;}>
}

/**
 * Get Available Security Questions Result interface
 */
export interface GetAvailableSecurityQuestionsResult {
  questions: Array<{ type: string; text: string }>
}

/**
 * Verify Security Questions Result interface
 */
export interface VerifySecurityQuestionsResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  verified?: boolean;
  resetToken?: string;
}

/**
 * Verify Secondary Email Result interface
 */
export interface VerifySecondaryEmailResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
}

/**
 * Setup Secondary Email Result interface
 */
export interface SetupSecondaryEmailResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  verificationToken?: string;
}

/**
 * Request Password Reset Secondary Result interface
 */
export interface RequestPasswordResetSecondaryResult {
  success: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  token?: string;
}

/**
 * Verify Password Reset Token Result interface
 */
export interface VerifyPasswordResetTokenResult {
  valid: boolean;
  message: string;
  userId?: number;
} 