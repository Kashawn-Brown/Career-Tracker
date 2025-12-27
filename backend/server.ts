import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { buildApp } from "./app.js";
import { validateEnv } from "./lib/env.js";

// Absolute path to .env.local
const envPath = path.resolve(".env.local");

// Make sure we are running locally (not in prod) + the file if it actually exists
if (process.env.NODE_ENV !== "production" && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

validateEnv();

const PORT = Number(process.env.PORT ?? 3002);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = buildApp();
await app.listen({ port: PORT, host: HOST });
