import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { UpdateMeBody } from "./user.schemas.js";
import type { UpdateMeBodyType } from "./user.schemas.js";
import * as UserService from "./user.service.js";

export async function userRoutes(app: FastifyInstance) {
  
    // Get current user profile (requires Bearer token)
  app.get("/me", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;

    const me = await UserService.getMe(userId);
    if (!me) return reply.status(404).send({ message: "User not found" });

    return { user: me };
  });

  // Update current user profile (MVP: name only)
  app.patch(
    "/me",
    { preHandler: [requireAuth], schema: { body: UpdateMeBody } },
    async (req) => {
      const userId = req.user!.id;
      const body = req.body as UpdateMeBodyType;

      const updated = await UserService.updateMe(userId, body);
      return { user: updated };
    }
  );
}
