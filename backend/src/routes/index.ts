import { FastifyInstance } from 'fastify';
import jobApplicationRoutes from './job-applications.js';
import tagRoutes from './tags.js';
import authRoutes from './auth.js';
import testEmailRoutes from './test-email.js';

// This file will be used to register all routes
export default async function routes(fastify: FastifyInstance) {
  // Root route
  fastify.get('/', async () => {
    return { message: 'Career Tracker API' };
  });

  // Health check route
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register job application routes under /api prefix
  fastify.register(jobApplicationRoutes, { prefix: '/api' });

  // Register tag routes under /api prefix
  fastify.register(tagRoutes, { prefix: '/api' });

  // Register authentication routes under /api/auth prefix
  fastify.register(authRoutes, { prefix: '/api/auth' });

  // Register test email routes under /api/test prefix (remove in production)
  fastify.register(testEmailRoutes, { prefix: '/api/test' });

  // Other routes will be registered here in future tasks
} 