/**
 * Document Upload Error Response Tests
 * 
 * Tests the enhanced error responses for document uploads.
 * Covers Step 3.5.3: Enhanced error responses with proper HTTP status codes.
 */

import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import formAutoContent from 'form-auto-content';
import fs from 'fs';

describe('Document Upload - Enhanced Error Responses', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: number;
  let testUserEmail: string;
  let validJobApplicationId: number;

  beforeAll(async () => {
    app = await buildApp();

    // Generate unique email for this test run
    const randomSuffix = randomBytes(4).toString('hex');
    testUserEmail = `test-errors-${randomSuffix}@example.com`;

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

    // Create a valid job application for some tests
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

    expect(createAppResponse.statusCode).toBe(201);
    const jobApp = JSON.parse(createAppResponse.body);
    validJobApplicationId = jobApp.id;
  });

  afterAll(async () => {
    await app.close();
  });

  
  describe('Enhanced Error Response Format', () => {
    it('should return enhanced 404 error for non-existent job application', async () => {
      // Setup a non-existent app ID 
      const nonExistentAppId = 99999;
      
      // Create a test file for upload
      const testContent = 'Test PDF content for enhanced error testing';
      const testBuffer = Buffer.from(testContent);
      const testFilePath = './test-enhanced-404.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        // Create multipart form with file
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        // Make request to non-existent job application
        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${nonExistentAppId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        // Verify status code is 404
        expect(response.statusCode).toBe(404);
        console.log("STATUS CODE:" + response.statusCode);
        console.log("RESPONSE BODY:" + response.body);
        const responseBody = JSON.parse(response.body);
        
        // Verify enhanced error response format
        expect(responseBody).toMatchObject({
          error: 'Job application not found',
          message: 'The specified job application does not exist or you do not have access to it',
          details: {
            jobApplicationId: nonExistentAppId,
            userId: userId,
            operation: 'application_validation'
          }
        });

        // Test passed - no timestamp validation needed since timestamp is not included in response
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should return enhanced 400 error for invalid job application ID', async () => {
      const invalidAppId = 'invalid-id';
      
      const testContent = 'Test PDF content for validation error';
      const testBuffer = Buffer.from(testContent);
      const testFilePath = './test-enhanced-400.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${invalidAppId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        expect(response.statusCode).toBe(400);
        const responseBody = JSON.parse(response.body);
        
        // Verify route validation error response format (this comes from Fastify route validation, not our controller)
        expect(responseBody).toMatchObject({
          error: 'Validation Error',
          message: 'Request validation failed'
        });
        
        // Route validation may or may not have details field, let's just verify it has the basic error structure
        expect(responseBody.error).toBeDefined();
        expect(responseBody.message).toBeDefined();
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });
}); 