import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import {
  ConnectionIdParams,
  CreateConnectionBody,
  UpdateConnectionBody,
  ListConnectionsQuery,
} from "./connections.schemas.js";
import type {
  ConnectionIdParamsType,
  CreateConnectionBodyType,
  UpdateConnectionBodyType,
  ListConnectionsQueryType,
} from "./connections.schemas.js";
import * as ConnectionsService from "./connections.service.js";

export async function connectionsRoutes(app: FastifyInstance) {
  
  /**
   * Create a new connection for the current user.
   */
  app.post(
    "/",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { body: CreateConnectionBody } },
    async (req, reply) => {
      const userId = req.user!.id;
      const body = req.body as CreateConnectionBodyType;

      const created = await ConnectionsService.createConnection({ userId, ...body });
      
      return reply.status(201).send({ connection: created });
    }
  );

  /**
   * List the current users connections.
   */
  app.get(
    "/",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { querystring: ListConnectionsQuery } },
    async (req, reply) => {
      const userId = req.user!.id;
      const query = req.query as ListConnectionsQueryType;

      const result = await ConnectionsService.listConnections({ userId, ...query });
      
      return reply.send(result);
    }
  );

  /**
   * Get one connection by ID for the current user.
   */
  app.get(
    "/:id",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { params: ConnectionIdParams } },
    async (req) => {
      const userId = req.user!.id;
      const { id } = req.params as ConnectionIdParamsType;

      const connection = await ConnectionsService.getConnectionById(userId, id);
      
      return { connection };
    }
  );

  /**
   * Update a connection for the current user.
   */
  app.patch(
    "/:id",
    {
      preHandler: [requireAuth, requireVerifiedEmail],
      schema: { params: ConnectionIdParams, body: UpdateConnectionBody },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const { id } = req.params as ConnectionIdParamsType;
      const body = req.body as UpdateConnectionBodyType;

      const updated = await ConnectionsService.updateConnection(userId, id, body);
      
      return reply.send({ connection: updated });
    }
  );

  /**
   * Delete a connection for the current user.
   */
  app.delete(
    "/:id",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { params: ConnectionIdParams } },
    async (req) => {
      const userId = req.user!.id;
      const { id } = req.params as ConnectionIdParamsType;

      return ConnectionsService.deleteConnection(userId, id);
    }
  );
}
