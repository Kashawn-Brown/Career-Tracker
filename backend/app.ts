import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { registerErrorHandlers } from "./middleware/error-handler.js";
import { debugRoutes } from "./modules/debug/debug.routes.js";
import { applicationsRoutes } from "./modules/applications/applications.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { userRoutes } from "./modules/user/user.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { connectionsRoutes } from "./modules/connections/connections.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";


export function buildApp() {
  const app = Fastify({ logger: true });

  // CORS: controlled by env so local + deployed frontends can call the API.
  // Set CORS_ORIGIN as a comma-separated list, ex: CORS_ORIGIN="http://localhost:3000,https://your-app.vercel.app"
  const corsOrigin = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);

  // CORS: allow the Next.js dev server to call the API during local development.
  app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // keep it disabled globally and enable per-route on auth endpoints only.
  app.register(rateLimit, { global: false });

  // Multipart uploads (Documents v1)
  // Security note: fastify-multipart defaults to 1MB. Set a safer default here.
  const maxUploadBytesRaw = Number(process.env.GCS_MAX_UPLOAD_BYTES);
  const maxUploadBytes = Number.isFinite(maxUploadBytesRaw) && maxUploadBytesRaw > 0 ? maxUploadBytesRaw : 10 * 1024 * 1024; // 10MB default

  // Register multipart plugin for file uploads
  app.register(multipart, {
    limits: {
      fileSize: maxUploadBytes,
      files: 1,
      parts: 20,
    },
  });

  // Health endpoint for local checks + Cloud Run later
  app.get("/health", async () => ({ ok: true }));

  // Register global error + 404 handlers (consistent API errors)
  registerErrorHandlers(app);

  // Mount Applications routes under /api/v1/applications
  app.register(applicationsRoutes, { prefix: "/api/v1/applications" });

  // Mount auth endpoints under /api/v1/auth
  app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Mount profile endpoints under /api/v1/user
  app.register(userRoutes, { prefix: "/api/v1/users" });

  // Mount Document endpoints under /api/v1/documents
  app.register(documentsRoutes, { prefix: "/api/v1/documents" });

  // Mount Connections endpoints under /api/v1/connections
  app.register(connectionsRoutes, { prefix: "/api/v1/connections" });

  // Mount AI endpoints under /api/v1/ai
  app.register(aiRoutes, { prefix: "/api/v1/ai" });


  // Debug route protected behind an env flag so it is not always enabled
  if (process.env.ENABLE_DEBUG_ROUTES === "true") {
    app.register(debugRoutes, { prefix: "/api/debug" });
  }

  return app;
}
