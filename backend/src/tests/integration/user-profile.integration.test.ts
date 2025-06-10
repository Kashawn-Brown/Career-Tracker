/**
 * User Profile API Integration Tests
 * 
 * Tests the user profile endpoints end-to-end with real HTTP requests.
 * These tests verify the complete flow: HTTP → Router → Controller → Service → Database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';

describe('User Profile API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: number;
  let testUserEmail: string;

  // Start the application and create shared test user before all tests
  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Create one shared test user for all tests
    testUserEmail = `integration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    
    // Register the shared test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: testUserEmail,
        password: 'Password123!',
        name: 'Test User'
      }
    });

    expect(registerResponse.statusCode).toBe(201);
    const registerData = JSON.parse(registerResponse.body);
    testUserId = registerData.user.id;

    // Login to get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUserEmail,
        password: 'Password123!'
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.tokens.accessToken;
  });

  // Clean up after all tests
  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/user', () => {
    it('should return user profile for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        id: expect.any(Number),
        name: 'Test User',
        email: expect.stringMatching(/@example\.com$/),
        role: 'USER',
        emailVerified: false,
        secondaryEmailVerified: false,
        provider: 'LOCAL',
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      // Check all fields are present
      expect(data).toHaveProperty('phone');
      expect(data).toHaveProperty('bio');
      expect(data).toHaveProperty('skills');
      expect(data).toHaveProperty('location');
      expect(data).toHaveProperty('currentJobTitle');
      expect(data).toHaveProperty('githubLink');
      expect(data).toHaveProperty('linkedinLink');
      expect(data).toHaveProperty('resumeLink');
      expect(data).toHaveProperty('secondaryEmail');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user'
        // No authorization header
      });

      expect(response.statusCode).toBe(401);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        statusCode: 401
      });
    });

    it('should return 401 for invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/user',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/user', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Test User',
        bio: 'This is my updated bio',
        skills: ['JavaScript', 'TypeScript', 'Node.js'],
        location: 'San Francisco, CA',
        currentJobTitle: 'Senior Developer',
        githubLink: 'https://github.com/testuser',
        linkedinLink: 'https://linkedin.com/in/testuser',
        resumeLink: 'https://example.com/resume.pdf'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: updateData
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        id: expect.any(Number),
        name: 'Updated Test User',
        bio: 'This is my updated bio',
        skills: ['JavaScript', 'TypeScript', 'Node.js'],
        location: 'San Francisco, CA',
        currentJobTitle: 'Senior Developer',
        githubLink: 'https://github.com/testuser',
        linkedinLink: 'https://linkedin.com/in/testuser',
        resumeLink: 'https://example.com/resume.pdf',
        role: 'USER',
        emailVerified: false,
        provider: 'LOCAL'
      });

      // Reset user data back to original state for other tests
      await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          name: 'Test User',
          bio: null,
          skills: null,
          location: null,
          currentJobTitle: null,
          githubLink: null,
          linkedinLink: null,
          resumeLink: null
        }
      });
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        githubLink: 'not-a-valid-url'
      };

      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: invalidData
      });

      expect(response.statusCode).toBe(400);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        statusCode: 400
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          name: 'Updated Name'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate GitHub URL format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          githubLink: 'https://notgithub.com/user'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate LinkedIn URL format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          linkedinLink: 'https://notlinkedin.com/user'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate skills array length limit', async () => {
      const tooManySkills = Array.from({ length: 25 }, (_, i) => `Skill ${i + 1}`);
      
      const response = await app.inject({
        method: 'PUT',
        url: '/api/user',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          skills: tooManySkills
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
}); 