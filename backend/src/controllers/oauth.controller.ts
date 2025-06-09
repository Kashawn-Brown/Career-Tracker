/**
 * OAuth Controller
 * 
 * Handles OAuth authentication flows including initiation and callbacks
 * for Google and LinkedIn OAuth providers.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import passport from 'passport';
import { authService } from '../services/index.js';
import { UserRole } from '../models/user.models.js';

export class OAuthController {
  /**
   * Initiate Google OAuth flow
   * GET /api/auth/google
   */
  async googleAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Redirect to Google OAuth
      return passport.authenticate('google', {
        scope: ['profile', 'email']
      })(request, reply);
    } catch (error) {
      console.error('Google OAuth initiation error:', error);
      return reply.status(500).send({
        error: 'Failed to initiate Google OAuth'
      });
    }
  }

  /**
   * Handle Google OAuth callback
   * GET /api/auth/callback/google
   */
  async googleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      return passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
        session: false
      }, async (err: any, user: any) => {
        if (err || !user) {
          console.error('Google OAuth callback error:', err);
          return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        try {
          // Generate JWT tokens for the user with role
          const tokens = authService.generateTokenPair(user.id, user.email, user.role as UserRole);
          
          // Redirect to frontend with tokens in query params (for demo purposes)
          // In production, consider using secure httpOnly cookies or a different approach
          const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
            `access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&user_id=${user.id}`;
          
          return reply.redirect(redirectUrl);
        } catch (tokenError) {
          console.error('Token generation error after Google OAuth:', tokenError);
          return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=token_failed`);
        }
      })(request, reply);

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
  }

  /**
   * Initiate LinkedIn OAuth flow
   * GET /api/auth/linkedin
   */
  async linkedinAuth(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Redirect to LinkedIn OAuth
      return passport.authenticate('linkedin', {
        scope: ['r_emailaddress', 'r_liteprofile']
      })(request, reply);
    } catch (error) {
      console.error('LinkedIn OAuth initiation error:', error);
      return reply.status(500).send({
        error: 'Failed to initiate LinkedIn OAuth'
      });
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   * GET /api/auth/callback/linkedin
   */
  async linkedinCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      return passport.authenticate('linkedin', {
        failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`,
        session: false
      }, async (err: any, user: any) => {
        if (err || !user) {
          console.error('LinkedIn OAuth callback error:', err);
          return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        try {
          // Generate JWT tokens for the user with role
          const tokens = authService.generateTokenPair(user.id, user.email, user.role as UserRole);
          
          // Redirect to frontend with tokens in query params (for demo purposes)
          // In production, consider using secure httpOnly cookies or a different approach
          const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
            `access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&user_id=${user.id}`;
          
          return reply.redirect(redirectUrl);
        } catch (tokenError) {
          console.error('Token generation error after LinkedIn OAuth:', tokenError);
          return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=token_failed`);
        }
      })(request, reply);

    } catch (error) {
      console.error('LinkedIn OAuth callback error:', error);
      return reply.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
    }
  }

  /**
   * Get OAuth provider status
   * GET /api/auth/oauth/status
   */
  async getOAuthStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = {
        google: {
          enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        },
        linkedin: {
          enabled: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
          configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET)
        }
      };

      return reply.send({
        message: 'OAuth provider status',
        providers: status
      });

    } catch (error) {
      console.error('OAuth status error:', error);
      return reply.status(500).send({
        error: 'Failed to get OAuth status'
      });
    }
  }
}

export const oauthController = new OAuthController(); 