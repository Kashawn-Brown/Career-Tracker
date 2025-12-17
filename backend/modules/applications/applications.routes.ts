import type { FastifyInstance, FastifyRequest } from "fastify";
import { CreateApplicationBody, ListApplicationsQuery } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, } from "./applications.schemas.js";
import * as ApplicationsService from "./applications.service.js";
import { requireAuth } from "../../middleware/auth.js";


export async function applicationsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new job application for the current user.
   * Validates request body shape using TypeBox schema (CreateApplicationBody).
   */
  app.post(
    "/",
    { 
      preHandler: [requireAuth],
      schema: { body: CreateApplicationBody } 
    },
    async (req, reply) => {
      
      const userId = req.user!.id;

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
    { 
      preHandler: [requireAuth],
      schema: { querystring: ListApplicationsQuery } 
    },
    async (req, reply) => {

      const userId = req.user!.id;

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
