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
      try {

        // Map request body to schema
        const body = req.body as RegisterBodyType;

        // Retrieve token and return token from successful register
        const result = await AuthService.register(body.email, body.password, body.name);
        return reply.status(201).send(result);

      } catch (e: any) {
        return reply.status(400).send({ message: e.message ?? "Register failed" });
      }
    }
  );

  // Login
  app.post(
    "/login",
    { schema: { body: LoginBody } },
    async (req, reply) => {
      try {
        const body = req.body as LoginBodyType;

        // Retrieve token and return token from successful login
        const result = await AuthService.login(body.email, body.password);
        return reply.send(result);

      } catch (e: any) {
        return reply.status(401).send({ message: e.message ?? "Login failed" });
      }
    }
  );

  // Me (Protected by middleware; proves JWT works)
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.user };
  });
}
