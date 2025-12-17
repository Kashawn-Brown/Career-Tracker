import Fastify from "fastify";
import { debugRoutes } from "./modules/debug/debug.routes.js";
import { applicationsRoutes } from "./modules/applications/applications.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  // Health endpoint for local checks + Cloud Run later
  app.get("/health", async () => ({ ok: true }));

  // Mount Applications routes under /api/v1/applications
  app.register(applicationsRoutes, { prefix: "/api/v1/applications" });

  // Mount auth endpoints under /api/v1/auth
  app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Mount profile endpoints under /api/v1/user
  app.register(userRoutes, { prefix: "/api/v1/users" });


  // Protected behind an env flag so it is not always enabled
  if (process.env.ENABLE_DEBUG_ROUTES === "true") {
    app.register(debugRoutes, { prefix: "/api/debug" });
  }

  return app;
}
