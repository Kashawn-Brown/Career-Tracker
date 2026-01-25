import type { FastifyInstance } from "fastify";
import { AppError } from "../errors/app-error.js";

/**
 * Central place for:
 * - 404s (route not found)
 * - unexpected errors (consistent response + server-side logging)
 */

// Helper function that takes Fastify app and adds global handlers to it
// Applies to all routes
export function registerErrorHandlers(app: FastifyInstance) {

  // If a request comes in and Fastify cannot find any matching route, it runs this handler.
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ message: "Route not found" });
  });

  // If any route/middleware/service throws an error (or rejects a promise) and it’s not handled, Fastify funnels it here
  app.setErrorHandler((err, req, reply) => {
    
    // Expected errors (4xx etc.) - known, intentional app errors
    if (err instanceof AppError) {
      // Log as warn (not a server bug, usually user input / state)
      req.log?.warn({ err }, "AppError");
      reply.status(err.statusCode).send({ message: err.message, ...(err.code ? { code: err.code } : {})});
      return;
    }

    // Known framework/plugin errors (rate-limit 429, validation 400, etc.)
    const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;

    if (statusCode >= 400 && statusCode < 500) {
      req.log?.warn({ err }, "Client error");
      return reply.status(statusCode).send({ message: err.message ?? "Bad Request" });
    }

    // Unexpected errors (server bugs, etc.)
    req.log?.error({ err }, "Unhandled error");
    reply.status(500).send({ message: "Internal Server Error" });
  });

}
