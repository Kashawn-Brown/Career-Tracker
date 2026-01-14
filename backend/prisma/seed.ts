/** DEPRECATED: This script is no longer used.
 * NEEDS TO BE UPDATED TO THE NEW SCHEMA.
 * 
 * THIS IS FOR THE LEGACY SCHEMA.
 */

/**
 * Seed data for local dev + performance testing.
 * - Creates/updates a dedicated seed user
 * - Replaces that user’s job applications with N fresh rows
 *
 * Run from backend workspace so dotenv loads backend/.env automatically.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, ApplicationStatus } from "@prisma/client";

const prisma = new PrismaClient();

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const countArg = Number(process.argv[2] ?? "200");
  const count = Number.isFinite(countArg) && countArg > 0 ? countArg : 200;

  const email = process.env.SEED_EMAIL ?? "seed_metrics@example.com";
  const password = process.env.SEED_PASSWORD ?? "Password123!";
  const name = process.env.SEED_NAME ?? "Seed Metrics User";

  const passwordHash = await bcrypt.hash(password, 12);

  // Create or update the seed user (idempotent)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
    select: { id: true, email: true },
  });

  // Replace ONLY the seed user's applications (safe for your real data)
  await prisma.jobApplication.deleteMany({ where: { userId: user.id } });

  const statuses = Object.values(ApplicationStatus);

  const companies = ["Acme", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Hooli"];
  const positions = ["Backend Developer", "Fullstack Dev", "SRE", "DevOps", "Software Engineer", "Cloud Dev"];

  const data = Array.from({ length: count }, (_, i) => ({
    userId: user.id,
    company: `${pick(companies, i)} ${i}`,
    position: pick(positions, i),
    status: pick(statuses, i),
    dateApplied: daysAgo(i % 90),
    jobLink: `https://example.com/jobs/${i}`,
    description: `Seed job description ${i}`,
    notes: `Seed notes ${i}`,
  }));

  await prisma.jobApplication.createMany({ data });

  console.log(`✅ Seeded ${count} applications for ${user.email}`);
  console.log(`Login creds: ${email} / ${password}`);
}

main()
  .finally(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
