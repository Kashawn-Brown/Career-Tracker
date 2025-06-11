/**
 * Document Integration Tests
 * 
 * End-to-end tests for document REST API endpoints.
 * Tests the complete flow from HTTP request to database operations.
 */

import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import formAutoContent from 'form-auto-content';
import fs from 'fs';

describe('Document API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserEmail: string;
  let testJobApplicationId: number;

  // Set up test environment
  beforeAll(async () => {
    app = await buildApp();
    
    // Generate unique email for this test run
    const randomSuffix = randomBytes(4).toString('hex');
    testUserEmail = `test-docs-${randomSuffix}@example.com`;

    // Register test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Document Test User',
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

    // Create a test job application for document operations
    const jobAppResponse = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: {
        authorization: `Bearer ${authToken}`,
        'content-type': 'application/json'
      },
      payload: {
        userId: loginData.user.id,
        company: 'Test Company',
        position: 'Test Position',
        status: 'applied',
        dateApplied: new Date().toISOString()
      }
    });

    expect(jobAppResponse.statusCode).toBe(201);
    const jobAppData = JSON.parse(jobAppResponse.body);
    testJobApplicationId = jobAppData.id;
  });

  // Clean up after all tests
  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/applications/:id/documents', () => {
    it('should upload a document successfully', async () => {
      // Create a test file buffer
      const testContent = 'This is a test PDF document content';
      const testBuffer = Buffer.from(testContent);
      
      // Create a temporary file for the test
      const testFilePath = './test-resume.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        // Create form with file using form-auto-content
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${testJobApplicationId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        expect(response.statusCode).toBe(201);
        
        const data = JSON.parse(response.body);
        expect(data).toMatchObject({
          id: expect.any(Number),
          filename: expect.stringContaining('test-resume'),
          originalName: 'test-resume.pdf',
          fileSize: testBuffer.length,
          mimeType: 'application/pdf',
          jobApplicationId: testJobApplicationId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        });
      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should return 400 for invalid job application ID', async () => {
      const testBuffer = Buffer.from('test content');
      const testFilePath = './test-invalid.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try { 
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/applications/invalid/documents',
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        expect(response.statusCode).toBe(400);
        
        const data = JSON.parse(response.body);
        expect(data).toMatchObject({
          error: 'Validation Error',
          message: 'Request validation failed'
        });
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should return 401 for unauthenticated requests', async () => {
      const testBuffer = Buffer.from('test content');
      const testFilePath = './test-unauth.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const response = await app.inject({
          method: 'POST',
          url: `/api/applications/${testJobApplicationId}/documents`,
          headers: form.headers,
          payload: form.payload
        });

        expect(response.statusCode).toBe(401);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/applications/${testJobApplicationId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json'
        },
        payload: {}
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/applications/:id/documents', () => {
    let uploadedDocumentId: number;

    beforeEach(async () => {
      // Upload a test document for listing tests
      const testBuffer = Buffer.from('Test document for listing');
      const testFilePath = './list-test.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const uploadResponse = await app.inject({
          method: 'POST',
          url: `/api/applications/${testJobApplicationId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        const uploadData = JSON.parse(uploadResponse.body);
        uploadedDocumentId = uploadData.id;
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should list documents for a job application', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        documents: expect.arrayContaining([
          expect.objectContaining({
            id: uploadedDocumentId,
            filename: expect.stringContaining('list-test'),
            originalName: 'list-test.pdf',
            jobApplicationId: testJobApplicationId
          })
        ]),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          pages: expect.any(Number)
        })
      });
    });

    it('should support pagination parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents?page=1&limit=5`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 5
      });
    });

    it('should return 400 for invalid job application ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/applications/invalid/documents',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/applications/:id/documents/:documentId', () => {
    let testDocumentId: number;

    beforeEach(async () => {
      // Upload a test document
      const testBuffer = Buffer.from('Test document for retrieval');
      const testFilePath = './get-test.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const uploadResponse = await app.inject({
          method: 'POST',
          url: `/api/applications/${testJobApplicationId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        const uploadData = JSON.parse(uploadResponse.body);
        testDocumentId = uploadData.id;
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should retrieve a specific document', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents/${testDocumentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        id: testDocumentId,
        filename: expect.stringContaining('get-test'),
        originalName: 'get-test.pdf',
        jobApplicationId: testJobApplicationId,
        jobApplication: expect.objectContaining({
          id: testJobApplicationId,
          company: 'Test Company',
          position: 'Test Position'
        })
      });
    });

    it('should return 400 for invalid IDs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/invalid/documents/invalid`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents/99999`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents/${testDocumentId}`
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/applications/:id/documents/:documentId', () => {
    let testDocumentId: number;

    beforeEach(async () => {
      // Upload a test document for deletion
      const testBuffer = Buffer.from('Test document for deletion');
      const testFilePath = './delete-test.pdf';
      fs.writeFileSync(testFilePath, testBuffer);
      
      try {
        const form = formAutoContent({
          document: fs.createReadStream(testFilePath)
        });

        const uploadResponse = await app.inject({
          method: 'POST',
          url: `/api/applications/${testJobApplicationId}/documents`,
          headers: {
            authorization: `Bearer ${authToken}`,
            ...form.headers
          },
          payload: form.payload
        });

        const uploadData = JSON.parse(uploadResponse.body);
        testDocumentId = uploadData.id;
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should delete a document successfully', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/applications/${testJobApplicationId}/documents/${testDocumentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toMatchObject({
        success: true,
        message: 'Document deleted successfully',
        deletedDocument: {
          id: testDocumentId,
          filename: expect.stringContaining('delete-test'),
          originalName: 'delete-test.pdf'
        }
      });

      // Verify document is actually deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/applications/${testJobApplicationId}/documents/${testDocumentId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 400 for invalid IDs', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/applications/invalid/documents/invalid`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent document', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/applications/${testJobApplicationId}/documents/99999`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/applications/${testJobApplicationId}/documents/${testDocumentId}`
      });

      expect(response.statusCode).toBe(401);
    });
  });
}); 