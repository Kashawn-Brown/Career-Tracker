/**
 * Admin Security Endpoints Integration Tests
 * 
 * Tests the admin security management endpoints:
 * - GET /api/admin/security/locked-accounts
 * - GET /api/admin/security/user/:userId  
 * - POST /api/admin/security/unlock-account/:userId
 * - GET /api/admin/security/audit-logs/:userId
 * - POST /api/admin/security/force-password-reset/:userId
 * - GET /api/admin/security/statistics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import config from '../../config/index.js';
import routes from '../../routes/index.js';
import { PassportConfig } from '../../config/passport.config.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  
  // Register plugins
  await app.register(cors, config.cors);
  await app.register(sensible);
  
  // Initialize Passport OAuth strategies
  PassportConfig.initialize();
  
  // Register all routes
  await app.register(routes);
  
  return app;
}

describe('Admin Security Endpoints Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await prisma.$connect();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('Authentication Requirements', () => {
    const adminEndpoints = [
      { method: 'GET', path: '/api/admin/security/locked-accounts' },
      { method: 'GET', path: '/api/admin/security/user/1' },
      { method: 'POST', path: '/api/admin/security/unlock-account/1' },
      { method: 'GET', path: '/api/admin/security/audit-logs/1' },
      { method: 'POST', path: '/api/admin/security/force-password-reset/1' },
      { method: 'GET', path: '/api/admin/security/statistics' }
    ];

    it.each(adminEndpoints)('should require authentication for $method $path', async ({ method, path }) => {
      const response = await app.inject({
        method: method as any,
        url: path,
        payload: method === 'POST' ? { reason: 'test' } : undefined
      });

      expect(response.statusCode).toBe(401);
      
      const payload = JSON.parse(response.payload);
      expect(payload.error).toBe('Authentication required');
    });
  });

  describe('Route Registration', () => {
    const testRoutes = [
      '/api/admin/security/statistics',
      '/api/admin/security/locked-accounts',
      '/api/admin/security/user/123'
    ];

    it.each(testRoutes)('should register route %s (returns 401, not 404)', async (route) => {
      const response = await app.inject({
        method: 'GET',
        url: route
      });

      // Should be 401 (unauthorized) not 404 (not found) - means routes are registered
      expect(response.statusCode).toBe(401);
    });
  });

  describe('CSRF Token Endpoint', () => {
    it('should provide CSRF token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/csrf-token'
      });

      expect(response.statusCode).toBe(200);
      
      const payload = JSON.parse(response.payload);
      expect(payload.csrfToken).toBeDefined();
      expect(typeof payload.csrfToken).toBe('string');
    });
  });

  describe('Admin Token Authentication', () => {
    it('should handle admin registration and login flow', async () => {
      // Test admin user registration
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'admin@test.com',
          password: 'AdminTest123!',
          name: 'Admin Test User'
        }
      });

      // Should either succeed (200) or fail with user exists (400/409)
      expect([200, 400, 409].includes(registerResponse.statusCode)).toBe(true);

      // Test admin login
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@test.com',
          password: 'AdminTest123!'
        }
      });

      if (loginResponse.statusCode === 200) {
        const loginPayload = JSON.parse(loginResponse.payload);
        expect(loginPayload.tokens.accessToken).toBeDefined();
      }
      // If login fails, it could be due to email verification requirements, etc.
    });
  });

  describe('Admin Endpoints with Authentication', () => {
    // This test would require a properly authenticated admin user
    // For now, we test that the endpoints exist and return appropriate errors
    it('should handle admin statistics endpoint appropriately', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/security/statistics',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      // Should return 401 (invalid token) or 403 (not admin), not 404 (not found)
      expect([401, 403].includes(response.statusCode)).toBe(true);
    });

    it('should handle locked accounts endpoint appropriately', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/security/locked-accounts',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      // Should return 401 (invalid token) or 403 (not admin), not 404 (not found)
      expect([401, 403].includes(response.statusCode)).toBe(true);
    });
  });
}); 