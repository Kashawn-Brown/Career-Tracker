/**
 * Career Tracker API Server
 * 
 * This is the main server file that sets up and configures the Fastify web server
 * for the Career Tracker application. It handles:
 * 
 * - Server initialization with logging configuration
 * - Plugin registration (CORS, sensible defaults)
 * - Health check endpoints for monitoring
 * - Database connectivity testing
 * - Basic API route setup
 * - Server startup and error handling
 * 
 * The server provides RESTful API endpoints for managing career-related data
 * and serves as the backend for the Career Tracker application.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import config from './config/index.js';
import prisma from './lib/prisma.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
server.register(cors, config.cors);
server.register(sensible);

// Health check route
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Database test route
server.get('/db-test', async () => {
  try {
    // Simple database query to test connection
    const userCount = await prisma.user.count();
    return { 
      status: 'ok', 
      message: 'Database connection successful',
      userCount,
      timestamp: new Date().toISOString() 
    };
  } catch (error) {
    return { 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    };
  }
});

// API routes
server.get('/', async () => {
  return { message: 'Career Tracker API' };
});

// Start the server
const start = async () => {
  try {
    await server.listen({ 
      port: config.server.port, 
      host: config.server.host 
    });
    console.log(`Server is running at http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start(); 