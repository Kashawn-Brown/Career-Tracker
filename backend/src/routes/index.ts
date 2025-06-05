import { FastifyInstance } from 'fastify';

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

  // Other routes will be registered here in future tasks
  // Example: fastify.register(require('./jobApplications'), { prefix: '/api/job-applications' });
} 