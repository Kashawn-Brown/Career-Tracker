import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

describe("Health", () => {
  it("GET /health returns { ok: true }", async () => {
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});
