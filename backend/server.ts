import dotenv from "dotenv";
import { buildApp } from "./app.js";

dotenv.config({ path: ".env.local" });

const PORT = Number(process.env.PORT ?? 3002);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = buildApp();
await app.listen({ port: PORT, host: HOST });
