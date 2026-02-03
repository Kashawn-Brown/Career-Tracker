# k6 Benchmarks (Local)

This directory contains the **benchmark docs + sanitized results exports** for the Career-Tracker backend.

The actual k6 scripts live one level up:

- `docs/perf/k6/list-applications.js`
- `docs/perf/k6/create-application.js`
- `docs/perf/k6/update-application.js`

The goal is to produce repeatable, production-quality baseline metrics you can re-run locally now and again after deploy (**Cloud Run + Cloud SQL**) later.

> **Important:** The numbers below are **local machine** results (best-case latency, no real network hop).  

---

## What was tested

Auth happens once in `setup()` (`POST /auth/login`), then each virtual user reuses the JWT for the rest of the run.

**Endpoints**
- `GET /applications` (pagination + sorting)
- `POST /applications` (create)
- `PATCH /applications/:id` (update)

**Load profile**
- `vus = 10`
- `duration = 20s`
- `sleep(0.2)` between iterations (small “think time”)
- Threshold: `http_req_failed < 1%`

**Datasets**
- One seeded user with **200** applications
- One seeded user with **1,000** applications

For `GET /applications`, runs were executed with two page sizes:
- `pageSize=20` (typical table page)
- `pageSize=100` (heavier page / export-like)

---

## How to run

### Prereqs
1) Backend is running locally at:
- `http://localhost:3002`
- API base: `http://localhost:3002/api/v1`

2) The seed user exists (default expected by the scripts):
- `seed_metrics@example.com` / `Password123!`
- and has the dataset size you want (`DATASET=200` or `DATASET=1000`)

> Note: How you seed is intentionally not forced here (keep this doc focused on running k6),
> but the benchmark scripts assume the user + dataset already exist.

---

### PowerShell examples (recommended)

Run from repo root:

```powershell
# Move into the scripts directory (keeps paths short + OUT_FILE simple)
cd .\docs\perf\k6

# List (pageSize 20)
k6 run .\list-applications.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=200 `
  -e PAGE_SIZE=20 `
  -e OUT_FILE=./benchmarks/results/list_200_p20.json

# Create
k6 run .\create-application.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=1000 `
  -e OUT_FILE=./benchmarks/results/create_1000.json

# Update
k6 run .\update-application.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=1000 `
  -e OUT_FILE=./benchmarks/results/update_1000.json
````

### Alternate (run without `cd`)

If you prefer to run from repo root without changing directories, just use full paths:

* Script: `.\docs\perf\k6\<script>.js`
* OUT_FILE: `./docs/perf/k6/benchmarks/results/<file>.json`

---

## Why `OUT_FILE`?

We’re using `handleSummary()` to write a **sanitized summary JSON**.

This avoids committing raw k6 exports that may contain setup data (example: no JWT token leaks in committed benchmark results).

---

## Results summary (sanitized exports)

Latency numbers are in **milliseconds (ms)**.

* **p50** = median (half the requests are faster than this)
* **p95** = tail latency (95% are faster than this)
* **p99** = “worst-case-ish” tail (99% are faster than this)
* **max** = single slowest request observed (often an outlier)

| Endpoint                | Dataset | Params       | Load         | Throughput | p50 ms | p95 ms | p99 ms | max ms | HTTP fail rate |
| ----------------------- | ------- | ------------ | ------------ | ---------- | ------ | ------ | ------ | ------ | -------------- |
| GET /applications       | 200     | pageSize=20  | 10 VUs × 20s | 46.83/s    | 8.75   | 15.92  | 18.32  | 20.04  | 0.00%          |
| GET /applications       | 200     | pageSize=100 | 10 VUs × 20s | 47.08/s    | 7.97   | 13.39  | 19.20  | 41.56  | 0.00%          |
| GET /applications       | 1000    | pageSize=20  | 10 VUs × 20s | 45.70/s    | 13.73  | 19.15  | 25.14  | 149.7  | 0.00%          |
| GET /applications       | 1000    | pageSize=100 | 10 VUs × 20s | 46.81/s    | 8.98   | 15.43  | 19.12  | 23.26  | 0.00%          |
| POST /applications      | 200     | —            | 10 VUs × 20s | 46.18/s    | 12.69  | 18.93  | 27.13  | 45.27  | 0.00%          |
| POST /applications      | 1000    | —            | 10 VUs × 20s | 46.08/s    | 12.85  | 21.24  | 30.56  | 50.54  | 0.00%          |
| PATCH /applications/:id | 200     | —            | 10 VUs × 20s | 44.36/s    | 22.70  | 28.40  | 40.71  | 48.43  | 0.00%          |
| PATCH /applications/:id | 1000    | —            | 10 VUs × 20s | 44.38/s    | 22.82  | 29.13  | 33.27  | 39.48  | 0.00%          |

---

## Key takeaways

* ✅ **0% HTTP request failures** across all runs (threshold `rate<0.01` satisfied).
* `GET /applications` stayed **sub-20ms p95** even at **1,000 records** (worst observed p95 ≈ **19.15ms**, `pageSize=20`).
* `POST /applications` stayed **sub-22ms p95** at **1,000 records** (p95 ≈ **21.24ms**).
* `PATCH /applications/:id` stayed **sub-30ms p95** (worst observed p95 ≈ **29.13ms**).

### Things to keep in mind (so the numbers stay “honest”)

* These are **local** results; Cloud Run/Cloud SQL will add real network + cold start effects.
* The **max** column is usually less important than **p95/p99** (max is often one-off noise).

---

_Last updated: 2026-02-02_
