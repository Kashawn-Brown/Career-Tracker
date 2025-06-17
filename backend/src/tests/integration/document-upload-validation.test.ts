/**
 * Document Upload Application Validation Tests
 * 
 * Tests the application existence validation for document uploads.
 * Covers Step 3.5.2: Application validation before document operations.
 */

import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import formAutoContent from 'form-auto-content';
import fs from 'fs';

describe('Document Upload - Application Validation', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: number;
  let testUserEmail: string;

  beforeAll(async () => {
    app = await buildApp();

    // Generate unique email for this test run
    const randomSuffix = randomBytes(4).toString('hex');
    testUserEmail = `test-validation-${randomSuffix}@example.com`;

    // Register test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Test User',
        email: testUserEmail,
        password: 'Password123!'
      }
    });

    expect(registerResponse.statusCode).toBe(201);

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
    userId = loginData.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Existence Validation', () => {
    it('should return 404 when job application does not exist', async () => {
      const nonExistentAppId = 99999;
      
      // Create a test file for upload
      const testContent = 'Test PDF content for validation';
      const testBuffer = Buffer.from(testContent);
      const testFilePath = './test-validation-404.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        // Create form with file using form-auto-content
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${nonExistentAppId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        expect(response.statusCode).toBe(404);
        const responseBody = JSON.parse(response.body);
        console.log("RESPONSE BODY: " + responseBody)
        expect(responseBody.error).toBe('Job application not found');
        expect(responseBody.message).toBe('The specified job application does not exist or you do not have access to it');
      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should return 404 when job application belongs to different user', async () => {
      // Create a job application with first user
      const createAppResponse = await app.inject({
        method: 'POST',
        url: '/api/applications',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {
          userId: userId,
          company: 'Test Company',
          position: 'Test Position',
          status: 'applied',
          dateApplied: new Date().toISOString()
        }
      });

      const jobApp = JSON.parse(createAppResponse.body);
      
      // Create second user with unique email
      const randomSuffix2 = randomBytes(4).toString('hex');
      const testUserEmail2 = `test-validation-2-${randomSuffix2}@example.com`;

      const registerResponse2 = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Test User 2',
          email: testUserEmail2,
          password: 'Password123!'
        }
      });

      expect(registerResponse2.statusCode).toBe(201);

      // Login with second user
      const loginResponse2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testUserEmail2,
          password: 'Password123!'
        }
      });

      expect(loginResponse2.statusCode).toBe(200);
      const loginData2 = JSON.parse(loginResponse2.body);
      const authToken2 = loginData2.tokens.accessToken;

      // Create a test file for second user's upload attempt
      const testContent2 = 'Test PDF content for user validation';
      const testBuffer2 = Buffer.from(testContent2);
      const testFilePath2 = './test-validation-user.pdf';
      fs.writeFileSync(testFilePath2, testBuffer2);

      try {
        // Create form with file using form-auto-content
        const form2 = formAutoContent({
          document: fs.createReadStream(testFilePath2)
        });

        // Try to upload document to first user's application with second user's token
        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${jobApp.id}/documents`,
          headers: {
            authorization: `Bearer ${authToken2}`,
            ...form2.headers
          },
          payload: form2.payload
        });

        expect(response.statusCode).toBe(403);
        const responseBody = JSON.parse(response.body);
        expect(responseBody.error).toBe('You can only access your own job applications');
        expect(responseBody.message).toBe('The specified job application does not exist or you do not have access to it');
      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath2)) {
          fs.unlinkSync(testFilePath2);
        }
      }
    });
  });
}); 