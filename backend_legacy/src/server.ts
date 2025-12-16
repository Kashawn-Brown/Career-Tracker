/**
 * Career Tracker API Server
 * 
 * Main server entry point that starts the Fastify web server for production.
 * 
 * Architecture:
 * - Uses app.ts for Fastify app configuration (industry best practice)
 * - This file handles only server startup and lifecycle management
 * - Separation enables testing, modularity, and deployment flexibility
 * 
 * The server provides RESTful API endpoints for managing career-related data
 * and serves as the backend for the Career Tracker application.
 * 
 * For testing or programmatic access, import buildApp from './app.js' instead.
 */

// Load environment variables from .env file
import 'dotenv/config';

import config from './config/index.js';
import { buildApp } from './app.js';

const server = buildApp();

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