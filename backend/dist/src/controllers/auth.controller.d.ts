/**
 * Authentication Controller
 *
 * Handles all authentication endpoints including registration, login,
 * email verification, token refresh, and logout.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
export declare class AuthController {
    /**
     * Register a new user with email and password
     * POST /api/auth/register
     */
    register(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Login with email and password
     * POST /api/auth/login
     */
    login(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Verify email with token
     * POST /api/auth/verify-email
     */
    verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Refresh JWT tokens
     * POST /api/auth/refresh
     */
    refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Resend email verification
     * POST /api/auth/resend-verification
     */
    resendVerification(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map