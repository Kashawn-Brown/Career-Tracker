import type { FastifyInstance, FastifyRequest } from "fastify";
import { CreateApplicationBody, ListApplicationsQuery } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, } from "./applications.schemas.js";
import * as ApplicationsService from "./applications.service.js";


/**
 * TEMP (dev-only): get a "current user" without real auth.
 * 
 * - In production, userId will come from req.user (JWT middleware).
 * - For now, allow a header ONLY when debug routes are enabled. (ENABLE_DEBUG_ROUTES=true)
 */
function getUserId(req: FastifyRequest): string {
  // For now (dev only), allow X-Debug-User-Id when ENABLE_DEBUG_ROUTES=true.
  if (process.env.ENABLE_DEBUG_ROUTES === "true") {
    const id = req.headers["x-debug-user-id"];
    if (typeof id === "string" && id.trim().length > 0) return id.trim();
  }
  return "";
}

export async function applicationsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new job application for the current user.
   * Validates request body shape using TypeBox schema (CreateApplicationBody).
   */
  app.post(
    "/",
    { schema: { body: CreateApplicationBody } },
    async (req, reply) => {
      
      const userId = getUserId(req);
      
      // user not found
      if (!userId) return reply.status(401).send({ message: "Unauthorized (missing user)" });

      // req.body is validated by Fastify against the schema,
      // and cast to a matching TS type for strong typing.
      const body = req.body as CreateApplicationBodyType;
      
      const created = await ApplicationsService.createApplication({ userId, ...body });
      return reply.status(201).send(created);

    }
  );

  /**
   * List job applications for the current user.
   * Supports basic filters: status and a text query (q) on company/position.
   */
  app.get(
    "/",
    { schema: { querystring: ListApplicationsQuery } },
    async (req, reply) => {

      const userId = getUserId(req);

      // user not found
      if (!userId) return reply.status(401).send({ message: "Unauthorized (missing user)" });

      const query = req.query as ListApplicationsQueryType;

      const rows = await ApplicationsService.listApplications({
        userId,
        status: query.status,
        q: query.q,
      });

      return { items: rows };
      
    }
  );
}
