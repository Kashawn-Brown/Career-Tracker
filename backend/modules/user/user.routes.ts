import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/auth.js";
import { requireVerifiedEmail } from "../../middleware/require-verified-email.js";
import { UpdateMeBody, ChangePasswordBody } from "./user.schemas.js";
import type { UpdateMeBodyType, ChangePasswordBodyType } from "./user.schemas.js";
import * as UserService from "./user.service.js";
import { AppError } from "../../errors/app-error.js";
import { clearRefreshCookie, rateLimitKeyByIp} from "../auth/auth.http.js";


export async function userRoutes(app: FastifyInstance) {
  
  /**
   * Gets the current user profile.
   * Requires JWT (Bearer token).
   */
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const userId = req.user!.id;

    const me = await UserService.getMe(userId);
    if (!me) throw new AppError("User not found", 404);

    // Get the latest AI Pro request for the user
    const aiProRequest = await UserService.getLatestAiProRequest(userId);

    return { user: me, aiProRequest };

  });

  /**
   * Update current user profile (MVP: name only)
   * User must be verified to update their profile.
   */
  app.patch(
    "/me",
    { preHandler: [requireAuth, requireVerifiedEmail], schema: { body: UpdateMeBody } },
    async (req) => {
      const userId = req.user!.id;
      const body = req.body as UpdateMeBodyType;

      const updated = await UserService.updateMe(userId, body);
      return { user: updated };
    }
  );

  /**
   * Change password for the current user.
   * 
   * - User must confirm their old password.
   * - Enforce password policy on new password.
   * - Return the success response
   */
  app.post(
    "/change-password",
    {
      schema: { body: ChangePasswordBody },
      preHandler: [requireAuth, requireVerifiedEmail],
      config: { rateLimit: { max: 10, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      const body = req.body as ChangePasswordBodyType;

      await UserService.changePassword(userId, body.oldPassword, body.newPassword);

      // Clear the refresh cookie
      clearRefreshCookie(reply);
      return reply.send({ ok: true });
    }
  );  


  /**
   * Deactivate the current account.
   *
   * - Immediately blocks authed access (requireAuth now checks isActive)
   * - Revokes all refresh sessions
   * - Clears refresh cookie
   *
   * Note: Signing in again reactivates the account.
   */
  app.delete(
    "/deactivate", 
    { 
      preHandler: [requireAuth], 
      config: { rateLimit: { max: 5, timeWindow: "1 minute", keyGenerator: rateLimitKeyByIp } },
    },
    async (req, reply) => {
      const userId = req.user!.id;
      
      await UserService.deactivateMe(userId);

      clearRefreshCookie(reply);
      return reply.send({ ok: true });
    }
  );

  /**
   * Force delete the current account.
   *
   * - Delete the user's account.
   * - Delete the user's data.
   * - Delete the user's tokens.
   */
  app.delete("/delete", { preHandler: [requireAuth] }, async (req, reply) => {

    const userId = req.user!.id;

    await UserService.forceDeleteUser(userId);

    clearRefreshCookie(reply);
    return reply.send({ ok: true });

  });
}
