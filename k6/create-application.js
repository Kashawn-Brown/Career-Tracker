import http from "k6/http";
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import { Trend } from "k6/metrics";

const createDuration = new Trend("create_duration");

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
  // Make each payload unique to avoid accidental conflicts
  const payload = {
    company: `Company ${__VU}-${__ITER}`,
    position: "Backend Dev",
    status: "APPLIED",
    jobLink: "https://example.com/job",
    notes: `created by k6 vu=${__VU} iter=${__ITER}`,
  };

  const res = http.post(
    `${data.baseUrl}/applications`,
    JSON.stringify(payload),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
      },
    }
  );

  createDuration.add(res.timings.duration);

  check(res, { "create returns 201": (r) => r.status === 201 });

  const body = res.json();
  const app = body?.application ?? body; // supports wrapped or unwrapped response

  check(app, {
    "returns created id": (a) => typeof a?.id === "string" && a.id.length > 0,
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
      test: "POST /applications",
      dataset,
      runAt: new Date().toISOString(),
      vus: options.vus,
      duration: options.duration,
      metrics: {
        http_req_failed: data.metrics.http_req_failed.values,
        http_reqs: data.metrics.http_reqs.values,
        create_duration: data.metrics.create_duration?.values,
      },
    };

    outputs[outFile] = JSON.stringify(safe, null, 2);

  }

  return outputs;
}
