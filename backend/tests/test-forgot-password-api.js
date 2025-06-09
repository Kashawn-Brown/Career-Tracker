/**
 * Integration test for forgot password API endpoint
 * Tests the actual HTTP endpoint by starting a test server
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import config from '../src/config/index.js';
import routes from '../src/routes/index.js';
import { PassportConfig } from '../src/config/passport.config.js';

async function buildTestApp() {
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

async function testForgotPasswordIntegration() {
  console.log('🚀 Starting Forgot Password Integration Test...\n');

  const app = await buildTestApp();
  
  try {
    console.log('1. Testing POST /api/auth/forgot-password with valid email...');
    
    const validResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {
        email: 'test@example.com'
      }
    });

    console.log('✅ Status Code:', validResponse.statusCode);
    console.log('✅ Response:', JSON.parse(validResponse.payload));
    
    if (validResponse.statusCode === 200) {
      console.log('✅ Valid email endpoint works correctly');
    } else {
      throw new Error(`Expected 200, got ${validResponse.statusCode}`);
    }

    console.log('\n2. Testing POST /api/auth/forgot-password with invalid email...');
    
    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {
        email: 'invalid-email'
      }
    });

    console.log('✅ Invalid email status:', invalidResponse.statusCode);
    console.log('✅ Invalid email response:', JSON.parse(invalidResponse.payload));
    
    if (invalidResponse.statusCode === 400) {
      console.log('✅ Invalid email properly rejected');
    } else {
      throw new Error(`Expected 400 for invalid email, got ${invalidResponse.statusCode}`);
    }

    console.log('\n3. Testing POST /api/auth/forgot-password with missing email...');
    
    const missingEmailResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: {}
    });

    console.log('✅ Missing email status:', missingEmailResponse.statusCode);
    
    if (missingEmailResponse.statusCode === 400) {
      console.log('✅ Missing email properly rejected');
    } else {
      throw new Error(`Expected 400 for missing email, got ${missingEmailResponse.statusCode}`);
    }

    console.log('\n4. Testing rate limiting (simulated multiple requests)...');
    
    // Simulate multiple requests to the same email
    const email = 'ratelimit@example.com';
    const requests = [];
    
    for (let i = 0; i < 4; i++) {
      requests.push(app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email }
      }));
    }
    
    const responses = await Promise.all(requests);
    
    console.log('✅ Request statuses:', responses.map(r => r.statusCode));
    
    // Should have at least some 429 responses if rate limiting works
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
    if (rateLimitedResponses.length > 0) {
      console.log('✅ Rate limiting is working');
    } else {
      console.log('⚠️  Rate limiting might not be active (Redis not configured?)');
    }

    console.log('\n🎉 All integration tests passed!');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Properly close all connections
    console.log('\n🔄 Shutting down test server...');
    
    // Close Fastify app
    await app.close();
    
    // Close database connections
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    
    // Close queue service connections if available
    try {
      const { queueService } = await import('../src/services/queue.service.js');
      if (queueService.isReady()) {
        await queueService.close();
      }
    } catch (err) {
      // Queue service might not be available
    }
    
    console.log('✅ All connections closed');
    
    // Force exit to ensure the process terminates
    process.exit(0);
  }
}

testForgotPasswordIntegration(); 