/**
 * OAuth Controller
 *
 * Handles OAuth authentication flows including initiation and callbacks
 * for Google and LinkedIn OAuth providers.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
export declare class OAuthController {
    /**
     * Initiate Google OAuth flow
     * GET /api/auth/google
     */
    googleAuth(request: FastifyRequest, reply: FastifyReply): Promise<any>;
    /**
     * Handle Google OAuth callback
     * GET /api/auth/callback/google
     */
    googleCallback(request: FastifyRequest, reply: FastifyReply): Promise<any>;
    /**
     * Initiate LinkedIn OAuth flow
     * GET /api/auth/linkedin
     */
    linkedinAuth(request: FastifyRequest, reply: FastifyReply): Promise<any>;
    /**
     * Handle LinkedIn OAuth callback
     * GET /api/auth/callback/linkedin
     */
    linkedinCallback(request: FastifyRequest, reply: FastifyReply): Promise<any>;
    /**
     * Get OAuth provider status
     * GET /api/auth/oauth/status
     */
    getOAuthStatus(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
export declare const oauthController: OAuthController;
//# sourceMappingURL=oauth.controller.d.ts.map