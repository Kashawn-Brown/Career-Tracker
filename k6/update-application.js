import http from "k6/http";
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { Trend } from "k6/metrics";

const updateDuration = new Trend("update_duration");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  vus: 10,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const baseUrl = __ENV.BASE_URL ?? "http://localhost:3002/api/v1";
  const email = __ENV.EMAIL ?? "seed_metrics@example.com";
  const password = __ENV.PASSWORD ?? "Password123!";
  const pageSize = Math.min(Number(__ENV.PAGE_SIZE ?? 100), 100); // how many ids to pull once

  const loginRes = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(loginRes, { "login returns 200": (r) => r.status === 200 });

  const token = loginRes.json("token");

  const listRes = http.get(
    `${baseUrl}/applications?page=1&pageSize=${pageSize}&sortBy=updatedAt&sortDir=desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  check(listRes, { "list returns 200": (r) => r.status === 200 });
  if (listRes.status !== 200) {
    console.log("List failed:", listRes.status, listRes.body);
    return { baseUrl, token, ids: [] };
  }

  const body = listRes.json();
  const items = Array.isArray(body?.items) ? body.items : body;

  check({ items }, { "has at least 1 id": (o) => Array.isArray(o.items) && o.items.length > 0 });

  const ids = items.map((a) => a.id).filter(Boolean);
  return { baseUrl, token, ids };
}

export default function (data) {
  const ids = data.ids;
  const id = ids[Math.floor(Math.random() * ids.length)];

  const payload = {
    notes: `updated by k6 vu=${__VU} iter=${__ITER}`,
  };

  const res = http.patch(
    `${data.baseUrl}/applications/${id}`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
      },
    }
  );

  updateDuration.add(res.timings.duration);

  check(res, { "update returns 200": (r) => r.status === 200 });

  const body = res.json();
  const app = body?.application ?? body;

  check(app, {
    "returns updated id": (a) => typeof a?.id === "string" && a.id === id,
  });

  sleep(0.2);
}

export function handleSummary(data) {
  const outFile = __ENV.OUT_FILE;
  const dataset = __ENV.DATASET ?? "unknown";

  // Console summary (replaces default)
  const outputs = {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };

  if (outFile) {
    const safe = {
      test: "PATCH /applications/:id",
      dataset,
      runAt: new Date().toISOString(),
      vus: options.vus,
      duration: options.duration,
      metrics: {
        http_req_failed: data.metrics.http_req_failed.values,
        http_reqs: data.metrics.http_reqs.values,
        update_duration: data.metrics.update_duration?.values,
        http_req_duration: data.metrics.http_req_duration?.values,
      },
    };

    outputs[outFile] = JSON.stringify(safe, null, 2);
  }

  return outputs;
}
