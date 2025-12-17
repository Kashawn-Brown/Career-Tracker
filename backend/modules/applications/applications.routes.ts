import type { FastifyInstance, FastifyRequest } from "fastify";
import { CreateApplicationBody, ListApplicationsQuery, ApplicationIdParams, UpdateApplicationBody, } from "./applications.schemas.js";
import type { CreateApplicationBodyType, ListApplicationsQueryType, ApplicationIdParamsType, UpdateApplicationBodyType, } from "./applications.schemas.js";
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

      const result = await ApplicationsService.listApplications({
        userId,
        status: query.status,
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      });

      return { result };
      
    }
  );

  /**
   * Get one application
   * Requires JWT
   * Returns a specific application record for the current user
   */
app.get(
  "/:id",
  {
    preHandler: [requireAuth],
    schema: { params: ApplicationIdParams },
  },
  async (req) => {
    const userId = req.user!.id;
    const { id } = req.params as ApplicationIdParamsType;

    const application = await ApplicationsService.getApplicationById(userId, id);
    return { application };
  }
);

  /**
   * Update an application
   * Requires JWT
   * Only updates the current user's application
   */
  app.patch(
    "/:id",
    { 
      preHandler: [requireAuth], 
      schema: { params: ApplicationIdParams, body: UpdateApplicationBody } 
    },
    async (req, reply) => {
      const userId = req.user!.id;
      
      const params = req.params as ApplicationIdParamsType;
      
      const body = req.body as UpdateApplicationBodyType;

      const updated = await ApplicationsService.updateApplication(userId, params.id, body);
      
      return reply.send({ application: updated });
    }
  );

  /**
   * Delete an application
   * Requires JWT
   * Only deletes the current user's application
   */
  app.delete(
    "/:id",
    { 
      preHandler: [requireAuth], 
      schema: { params: ApplicationIdParams } 
    },
    async (req) => {
      const userId = req.user!.id;
      const params = req.params as ApplicationIdParamsType;

      return ApplicationsService.deleteApplication(userId, params.id);
    }
  );

}
