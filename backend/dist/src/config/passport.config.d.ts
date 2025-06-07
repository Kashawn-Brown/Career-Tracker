/**
 * Passport.js Configuration
 *
 * Sets up and configures Passport.js with OAuth strategies for:
 * - Google OAuth 2.0
 * - LinkedIn OAuth 2.0
 *
 * Handles user serialization/deserialization and OAuth callback logic.
 */
import passport from 'passport';
export declare class PassportConfig {
    /**
     * Initialize Passport.js with all OAuth strategies
     */
    static initialize(): passport.PassportStatic;
    /**
     * Configure Google OAuth 2.0 strategy
     */
    private static configureGoogleStrategy;
    /**
     * Configure LinkedIn OAuth 2.0 strategy
     */
    private static configureLinkedInStrategy;
    /**
     * Handle OAuth login - find existing user or create new one
     */
    private static handleOAuthLogin;
    /**
     * Check if OAuth providers are configured
     */
    static getConfiguredProviders(): {
        google: boolean;
        linkedin: boolean;
    };
}
export declare const passportInstance: passport.PassportStatic;
//# sourceMappingURL=passport.config.d.ts.map