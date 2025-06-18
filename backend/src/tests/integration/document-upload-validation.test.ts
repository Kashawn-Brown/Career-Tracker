/**
 * Document Upload Validation Integration Tests
 * 
 * Tests validation and error handling for document upload operations.
 * Focuses on application-level validation logic that extends beyond
 * basic parameter validation.
 */

import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import formAutoContent from 'form-auto-content';
import fs from 'fs';

describe('Document Upload - Application Validation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Existence Validation', () => {
    it('should return 404 when job application does not exist', async () => {
      // Generate unique email for this test
      const randomSuffix = randomBytes(4).toString('hex');
      const testUserEmail = `test-validation-1-${randomSuffix}@example.com`;

      // Register and login test user
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Validation Test User 1',
          email: testUserEmail,
          password: 'Password123!'
        }
      });

      expect(registerResponse.statusCode).toBe(201);

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
      const authToken = loginData.tokens.accessToken;

      const testBuffer = Buffer.from('Test content for non-existent application');
      const testFilePath = './test-validation-nonexistent.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/applications/99999/documents',
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        expect(response.statusCode).toBe(404);
        const responseBody = JSON.parse(response.body);
        expect(responseBody.error).toBe('Job application not found');
      } finally {
        // Cleanup
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });
}); 