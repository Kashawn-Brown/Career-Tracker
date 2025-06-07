/**
 * Authentication Service
 *
 * Core authentication services for password hashing, JWT token management,
 * and email verification. Provides the foundational security operations
 * for the authentication system.
 */
import { JWTPayload, TokenPair, EmailVerificationResult, ResendVerificationResult, PasswordValidationResult } from '../models/auth.models.js';
export declare class AuthService {
    /**
     * Hash a password using bcrypt with 12 rounds for strong security
     */
    hashPassword(password: string): Promise<string>;
    /**
     * Compare a plain text password with a hashed password
     */
    comparePassword(password: string, hash: string): Promise<boolean>;
    /**
     * Generate both access and refresh JWT tokens for a user
     */
    generateTokenPair(userId: number, email: string): TokenPair;
    /**
     * Verify and decode an access JWT token
     */
    verifyAccessToken(token: string): JWTPayload;
    /**
     * Verify and decode a refresh JWT token
     */
    verifyRefreshToken(token: string): JWTPayload;
    /**
     * Generate a secure random token for email verification
     * Returns a URL-safe random string
     */
    generateEmailVerificationToken(): string;
    /**
     * Calculate expiration date for email verification tokens (24 hours)
     */
    getEmailVerificationExpiry(): Date;
    /**
     * Calculate expiration date for refresh tokens (7 days)
     */
    getRefreshTokenExpiry(): Date;
    /**
     * Validate email format using basic regex
     */
    isValidEmail(email: string): boolean;
    /**
     * Validate password strength
     */
    isValidPassword(password: string): PasswordValidationResult;
    /**
     * Store email verification token in database
     */
    storeEmailVerificationToken(userId: number, token: string): Promise<void>;
    /**
     * Verify email verification token and mark user as verified
     */
    verifyEmailToken(token: string): Promise<EmailVerificationResult>;
    /**
     * Resend email verification token (for expired or lost tokens)
     */
    resendEmailVerification(email: string): Promise<ResendVerificationResult>;
    /**
     * Refresh tokens using a valid refresh token
     */
    refreshTokens(refreshToken: string): Promise<TokenPair>;
    /**
     * Clean up expired email verification tokens (maintenance function)
     */
    cleanupExpiredTokens(): Promise<number>;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map