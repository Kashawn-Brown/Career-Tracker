import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3002);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = buildApp();
await app.listen({ port: PORT, host: HOST });
