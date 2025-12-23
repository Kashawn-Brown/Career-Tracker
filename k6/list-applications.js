import http from "k6/http";
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { Trend } from "k6/metrics";


const listDuration = new Trend("list_duration");

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

  listDuration.add(listResponse.timings.duration);

  check(listResponse, { "list returns 200": (r) => r.status === 200 });

  const body = listResponse.json();

  const items = Array.isArray(body?.items) ? body.items : body; // supports {items:[...]} OR [...]

  check({ items }, {
    "returns items array": (o) => Array.isArray(o.items),
  });

  // tiny pause so we don't create totally unrealistic “no think time” load
  sleep(0.2);
}


// Safe export: no setup_data => no JWT token leaks
export function handleSummary(data) {
  const outFile = __ENV.OUT_FILE; // e.g. benchmarks/results/list_200_p20.json
  const dataset = __ENV.DATASET ?? "unknown";

  // Console summary (replaces default)
  const outputs = {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };

  if (outFile) {
    
    const safe = {
      test: "GET /applications",
      dataset,
      runAt: new Date().toISOString(), // ✅ timestamp inside the file
      pageSize: Number(__ENV.PAGE_SIZE ?? 20),
      vus: options.vus,
      duration: options.duration,
      metrics: {
        http_req_failed: data.metrics.http_req_failed.values,
        http_reqs: data.metrics.http_reqs.values,
        list_duration: data.metrics.list_duration?.values,
        http_req_duration: data.metrics.http_req_duration?.values,
      },
    };

    outputs[outFile] = JSON.stringify(safe, null, 2);
  }

  return outputs;
}
