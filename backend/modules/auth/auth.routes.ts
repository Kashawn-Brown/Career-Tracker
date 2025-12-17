import type { FastifyInstance } from "fastify";
import { RegisterBody, LoginBody } from "./auth.schemas.js";
import type { RegisterBodyType, LoginBodyType } from "./auth.schemas.js";
import * as AuthService from "./auth.service.js";
import { requireAuth } from "../../middleware/auth.js";

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post(
    "/register",
    { schema: { body: RegisterBody } },
    async (req, reply) => {

      // Map request body to schema
      const body = req.body as RegisterBodyType;

      // Retrieve token and return token from successful register
      const result = await AuthService.register(body.email, body.password, body.name);
      return reply.status(201).send(result);
    }
  );

  // Login
  app.post(
    "/login",
    { schema: { body: LoginBody } },
    async (req, reply) => {

      const body = req.body as LoginBodyType;

      // Retrieve token and return token from successful login
      const result = await AuthService.login(body.email, body.password);
      return reply.send(result);
    }
  );

  // Me (Protected by middleware; proves JWT works)
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.user };
  });
}
