/**
 * Fastify App Builder
 * 
 * Creates and configures a Fastify instance with all plugins and routes.
 * This follows the industry standard pattern of separating app configuration
 * from server startup, enabling better testing, modularity, and deployment flexibility.
 * 
 * Used by:
 * - server.ts - Production server startup
 * - Integration tests - Testing without starting actual server
 * - Future: Workers, CLI tools, multiple environments
 * 
 * Benefits:
 * - Testing: Can test app without binding to ports
 * - Modularity: App logic separated from startup concerns
 * - Flexibility: Same app can run in different contexts
 * - Industry Standard: Follows Express, Fastify, Node.js best practices
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import config from './config/index.js';
import routes from './routes/index.js';
import { PassportConfig } from './config/passport.config.js';
import { globalErrorHandler } from './middleware/error.middleware.js';

/**
 * Build and configure a Fastify app instance
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
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
  app.register(cors, config.cors);
  app.register(sensible);

  // Set global error handler
  app.setErrorHandler(globalErrorHandler);

  // Initialize Passport OAuth strategies
  PassportConfig.initialize();

  // Register all routes
  app.register(routes);

  return app;
} 