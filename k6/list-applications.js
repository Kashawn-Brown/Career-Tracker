import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  // We want median + p95 visible in output
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],

  // Sensible starter load (we can tune after baseline)
  vus: 10,
  duration: "20s",

  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% failures
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL ?? "http://localhost:3002/api/v1";
  const email = __ENV.EMAIL ?? "seed_metrics@example.com";
  const password = __ENV.PASSWORD ?? "Password123!";

  const res = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, { "login returns 200": (r) => r.status === 200 });

  const token = res.json("token");
  return { baseUrl, token };
}

export default function (data) {
  const pageSize = Number(__ENV.PAGE_SIZE ?? 20);

  const listResponse = http.get(
    `${data.baseUrl}/applications?page=1&pageSize=${pageSize}&sortBy=updatedAt&sortDir=desc`,
    { headers: { Authorization: `Bearer ${data.token}` } }
  );

  const body = listResponse.json();

  check(body, {
    "returns items array": (b) => Array.isArray(b.items),
  });

  // tiny pause so we don't create totally unrealistic “no think time” load
  sleep(0.2);
}
