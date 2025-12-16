import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({ logger: true });

  // Health endpoint for local checks + Cloud Run later
  app.get("/health", async () => ({ ok: true }));

  return app;
}
