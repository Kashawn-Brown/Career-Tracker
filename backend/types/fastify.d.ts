import "fastify";

// Ensures TypeScript loads Fastify’s original type definitions so we can extend them
declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
    };
  }
}

// "When you see FastifyRequest, treat it as if it also has an optional user field shaped like { id, email }"
// Optional because not every request is authenticated