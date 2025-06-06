import { FastifyInstance } from 'fastify';
import jobApplicationRoutes from './job-applications.js';

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

  // Other routes will be registered here in future tasks
} 