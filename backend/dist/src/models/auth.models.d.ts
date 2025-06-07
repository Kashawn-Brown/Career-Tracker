/**
 * Authentication Models
 *
 * Defines TypeScript interfaces and types for authentication-related entities.
 * These models represent the structure of authentication data used throughout the application.
 */
/**
 * JWT Payload interface for token content
 */
export interface JWTPayload {
    userId: number;
    email: string;
    type: 'access' | 'refresh';
}
/**
 * Token Pair interface for authentication responses
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
/**
 * Authentication Provider enum
 * Used for OAuth and local authentication
 */
export declare enum AuthProvider {
    LOCAL = "LOCAL",
    GOOGLE = "GOOGLE",
    LINKEDIN = "LINKEDIN",
    GITHUB = "GITHUB"
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
//# sourceMappingURL=auth.models.d.ts.map