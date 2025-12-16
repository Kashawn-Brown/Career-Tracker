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
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { repositories } from '../repositories/index.js';
import { AuthProvider, OAuthProfile } from '../models/auth.models.js';

// Environment variables for OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';



export class PassportConfig {
  /**
   * Initialize Passport.js with all OAuth strategies
   */
  static initialize() {
    // Configure user serialization for sessions
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await repositories.user.findById(id);
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    });

    // Configure OAuth strategies
    this.configureGoogleStrategy();
    this.configureLinkedInStrategy();

    return passport;
  }

  /**
   * Configure Google OAuth 2.0 strategy
   */
  private static configureGoogleStrategy() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.warn('⚠️  Google OAuth credentials not configured - Google login will be disabled');
      return;
    }

    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/callback/google`,
      scope: ['profile', 'email']
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const displayName = profile.displayName || 
          `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
          profile.emails?.[0]?.value?.split('@')[0] || 
          'User';

        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: displayName,
          provider: AuthProvider.GOOGLE,
          photo: profile.photos?.[0]?.value
        };

        const user = await this.handleOAuthLogin(oauthProfile);
        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, false);
      }
    }));
  }

  /**
   * Configure LinkedIn OAuth 2.0 strategy
   */
  private static configureLinkedInStrategy() {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.warn('⚠️  LinkedIn OAuth credentials not configured - LinkedIn login will be disabled');
      return;
    }

    passport.use(new LinkedInStrategy({
      clientID: LINKEDIN_CLIENT_ID,
      clientSecret: LINKEDIN_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/api/auth/callback/linkedin`,
      scope: ['r_emailaddress', 'r_liteprofile']
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const displayName = profile.displayName || 
          `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
          profile.emails?.[0]?.value?.split('@')[0] || 
          'User';

        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: displayName,
          provider: AuthProvider.LINKEDIN,
          photo: profile.photos?.[0]?.value
        };

        const user = await this.handleOAuthLogin(oauthProfile);
        return done(null, user);
      } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        return done(error, false);
      }
    }));
  }

  /**
   * Handle OAuth login - find existing user or create new one
   */
  private static async handleOAuthLogin(profile: OAuthProfile): Promise<any> {
    // Check if user exists by email
    let user = await repositories.user.findByEmail(profile.email);

    if (user) {
      // User exists - update OAuth info if needed
      if (user.provider === 'LOCAL') {
        // User signed up with email/password, link OAuth account
        user = await repositories.user.update(user.id, {
          provider: profile.provider,
          providerId: profile.id
        } as any);
      } else if (user.provider !== profile.provider || user.providerId !== profile.id) {
        // Update OAuth provider info
        user = await repositories.user.update(user.id, {
          provider: profile.provider,
          providerId: profile.id
        } as any);
      }
    } else {
      // Create new user from OAuth profile
      user = await repositories.user.create({
        email: profile.email,
        name: profile.name,
        provider: profile.provider,
        providerId: profile.id,
        emailVerified: true, // OAuth emails are pre-verified
        password: null // No password for OAuth users
      } as any);
    }

    return user;
  }

  /**
   * Check if OAuth providers are configured
   */
  static getConfiguredProviders(): { google: boolean; linkedin: boolean } {
    return {
      google: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
      linkedin: !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET)
    };
  }
}

// Export configured passport instance
export const passportInstance = PassportConfig.initialize(); 