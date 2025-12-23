import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { UpdateMeBody } from "./user.schemas.js";
import type { UpdateMeBodyType } from "./user.schemas.js";
import * as UserService from "./user.service.js";
import { AppError } from "../../errors/app-error.js";


export async function userRoutes(app: FastifyInstance) {
  
  /**
   * Gets the current user profile.
   * Requires JWT (Bearer token).
   */
  app.get("/me", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;

    const me = await UserService.getMe(userId);
    if (!me) throw new AppError("User not found", 404);

    return { user: me };
  });

  /**
   * Update current user profile (MVP: name only)
   * Requires JWT (Bearer token)
   */
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
