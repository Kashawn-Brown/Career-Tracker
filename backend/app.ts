import Fastify from "fastify";
import { debugRoutes } from "./modules/debug/debug.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  // Health endpoint for local checks + Cloud Run later
  app.get("/health", async () => ({ ok: true }));


  // Protected behind an env flag so it is not always enabled
  if (process.env.ENABLE_DEBUG_ROUTES === "true") {
    app.register(debugRoutes, { prefix: "/api/debug" });
  }

  return app;
}
