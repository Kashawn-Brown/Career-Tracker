/**
 * User Profile Schema Tests
 * 
 * Tests for user profile schema validation functions and helpers.
 * Ensures proper validation of GitHub URLs, LinkedIn URLs, emails, and data sanitization.
 */

import { describe, it, expect } from 'vitest';
import { userProfileValidation } from '../../schemas/user-profile.schema.js';

describe('User Profile Schema Validation', () => {
  describe('isValidGithubUrl', () => {
    it('should return true for valid GitHub URLs', () => {
      const validUrls = [
        'https://github.com/username',
        'http://github.com/user/repo',
        'https://www.github.com/organization',
        'http://www.github.com/user/repo/issues'
      ];

      validUrls.forEach(url => {
        expect(userProfileValidation.isValidGithubUrl(url)).toBe(true);
      });
    });

    it('should return false for invalid GitHub URLs', () => {
      const invalidUrls = [
        'https://gitlab.com/user',
        'https://bitbucket.org/user',
        'github.com/user',
        'https://githubcom/user',
        'ftp://github.com/user',
        'https://not-github.com/user'
      ];

      invalidUrls.forEach(url => {
        expect(userProfileValidation.isValidGithubUrl(url)).toBe(false);
      });
    });

    it('should return true for null/empty values', () => {
      expect(userProfileValidation.isValidGithubUrl('')).toBe(true);
      expect(userProfileValidation.isValidGithubUrl(null as any)).toBe(true);
      expect(userProfileValidation.isValidGithubUrl(undefined as any)).toBe(true);
    });
  });

  describe('isValidLinkedinUrl', () => {
    it('should return true for valid LinkedIn URLs', () => {
      const validUrls = [
        'https://linkedin.com/in/username',
        'http://linkedin.com/company/company-name',
        'https://www.linkedin.com/in/user-name',
        'http://www.linkedin.com/pub/user/123/456/789'
      ];

      validUrls.forEach(url => {
        expect(userProfileValidation.isValidLinkedinUrl(url)).toBe(true);
      });
    });

    it('should return false for invalid LinkedIn URLs', () => {
      const invalidUrls = [
        'https://facebook.com/user',
        'https://twitter.com/user',
        'linkedin.com/in/user',
        'https://linkedincom/user',
        'ftp://linkedin.com/user',
        'https://not-linkedin.com/user'
      ];

      invalidUrls.forEach(url => {
        expect(userProfileValidation.isValidLinkedinUrl(url)).toBe(false);
      });
    });

    it('should return true for null/empty values', () => {
      expect(userProfileValidation.isValidLinkedinUrl('')).toBe(true);
      expect(userProfileValidation.isValidLinkedinUrl(null as any)).toBe(true);
      expect(userProfileValidation.isValidLinkedinUrl(undefined as any)).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.io',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(userProfileValidation.isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        'user@domain',
        'user space@domain.com',
        'a'.repeat(250) + '@domain.com' // Too long
      ];

      invalidEmails.forEach(email => {
        expect(userProfileValidation.isValidEmail(email)).toBe(false);
      });
    });

    it('should return true for null/empty values', () => {
      expect(userProfileValidation.isValidEmail('')).toBe(true);
      expect(userProfileValidation.isValidEmail(null as any)).toBe(true);
      expect(userProfileValidation.isValidEmail(undefined as any)).toBe(true);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.example.com/path',
        'http://localhost:3000',
        'https://example.com/path?query=value#hash'
      ];

      validUrls.forEach(url => {
        expect(userProfileValidation.isValidUrl(url)).toBe(true);
      });
    });

    it('should return false for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'example.com',
        'http://',
        'https://',
        'mailto:user@example.com'
      ];

      invalidUrls.forEach(url => {
        expect(userProfileValidation.isValidUrl(url)).toBe(false);
      });
    });

    it('should return true for null/empty values', () => {
      expect(userProfileValidation.isValidUrl('')).toBe(true);
      expect(userProfileValidation.isValidUrl(null as any)).toBe(true);
      expect(userProfileValidation.isValidUrl(undefined as any)).toBe(true);
    });
  });

  describe('sanitizeUpdateData', () => {
    it('should trim string values', () => {
      const input = {
        name: '  John Doe  ',
        secondaryEmail: '  test@example.com  ',
        resumeLink: '  https://example.com/resume  ',
        githubLink: '  https://github.com/user  ',
        linkedinLink: '  https://linkedin.com/in/user  '
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result.name).toBe('John Doe');
      expect(result.secondaryEmail).toBe('test@example.com');
      expect(result.resumeLink).toBe('https://example.com/resume');
      expect(result.githubLink).toBe('https://github.com/user');
      expect(result.linkedinLink).toBe('https://linkedin.com/in/user');
    });

    it('should convert secondary email to lowercase', () => {
      const input = {
        secondaryEmail: '  TEST@EXAMPLE.COM  '
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result.secondaryEmail).toBe('test@example.com');
    });

    it('should handle null values correctly', () => {
      const input = {
        name: 'John Doe',
        secondaryEmail: null,
        resumeLink: null,
        githubLink: null,
        linkedinLink: null
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result.name).toBe('John Doe');
      expect(result.secondaryEmail).toBe(null);
      expect(result.resumeLink).toBe(null);
      expect(result.githubLink).toBe(null);
      expect(result.linkedinLink).toBe(null);
    });

    it('should only include provided fields', () => {
      const input = {
        name: 'John Doe',
        githubLink: 'https://github.com/user'
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result).toEqual({
        name: 'John Doe',
        githubLink: 'https://github.com/user'
      });
      expect(result.secondaryEmail).toBeUndefined();
      expect(result.resumeLink).toBeUndefined();
      expect(result.linkedinLink).toBeUndefined();
    });

    it('should handle non-string values for URL fields', () => {
      const input = {
        name: 123, // Non-string
        secondaryEmail: 456, // Non-string
        resumeLink: null,
        githubLink: undefined,
        linkedinLink: ''
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result.name).toBe(123); // Non-string passed through
      expect(result.secondaryEmail).toBe(456); // Non-string passed through
      expect(result.resumeLink).toBe(null);
      expect(result.githubLink).toBe(undefined);
      expect(result.linkedinLink).toBe('');
    });

    it('should handle empty input object', () => {
      const input = {};

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result).toEqual({});
    });

    it('should ignore undefined values', () => {
      const input = {
        name: 'John Doe',
        secondaryEmail: undefined,
        resumeLink: 'https://example.com/resume'
      };

      const result = userProfileValidation.sanitizeUpdateData(input);

      expect(result).toEqual({
        name: 'John Doe',
        resumeLink: 'https://example.com/resume'
      });
      expect(result.hasOwnProperty('secondaryEmail')).toBe(false);
    });
  });
}); 