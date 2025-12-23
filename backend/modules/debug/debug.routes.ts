import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";

export async function debugRoutes(app: FastifyInstance) {
  app.post("/seed", async () => {
    const stamp = Date.now();

    const email = `seed_${stamp}@example.com`;
    const password = "Password123!"; // for local testing only
    const passwordHash = await bcrypt.hash(password, 12);

    const created = await prisma.user.create({
      data: {
        email,
        name: "Seed User",
        passwordHash,
        jobApplications: {
          create: {
            company: "Acme Inc",
            position: "Backend Developer",
            status: "APPLIED",
            jobLink: "https://example.com/job",
            notes: "Seeded from /api/debug/seed"
          }
        }
      },
      include: { jobApplications: true }
    });

    return {
      message: "Seed complete",
      // returning password is OK here because this route is debug-only
      login: { email, password },
      user: created
    };
  });
}

// Creating a temporary debug route to ensure everything is wired correctly