# Benchmarks (Local)

Tooling:
- k6: 10 VUs, 20s duration, 200ms think time
- API: Fastify + Prisma + Postgres (local)
- Dataset: seeded per run for user seed_metrics@example.com

## GET /applications (pagination + sorting)

### Dataset: 200
- pageSize=20: p50=?, p95=?, req/s=?, http_req_failed=?
- pageSize=100: p50=?, p95=?, req/s=?, http_req_failed=?

### Dataset: 1000
- pageSize=20: p50=?, p95=?, req/s=?, http_req_failed=?
- pageSize=100: p50=?, p95=?, req/s=?, http_req_failed=?

## POST /applications

### Dataset: 200
- p50=?, p95=?, req/s=?, http_req_failed=?

### Dataset: 1000
- p50=?, p95=?, req/s=?, http_req_failed=?

## PATCH /applications/:id

### Dataset: 200
- p50=?, p95=?, req/s=?, http_req_failed=?

### Dataset: 1000
- p50=?, p95=?, req/s=?, http_req_failed=?

Notes:
- Local numbers are for iteration/engineering validation; Cloud Run + Cloud SQL numbers will be used for final resume bullets.

## Commands

### GET list (dataset 200, pageSize 20):

```powershell
k6 run .\k6\list-applications.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=200 `
  -e PAGE_SIZE=20 `
  -e OUT_FILE=./k6/benchmarks/results/list_200_p20.json
```

### GET list (dataset 200, pageSize 100):

```powershell
k6 run .\k6\list-applications.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=200 `
  -e PAGE_SIZE=100 `
  -e OUT_FILE=./k6/benchmarks/results/list_200_p100.json
```

### POST create

```powershell
k6 run .\k6\create-application.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=200 `
  -e OUT_FILE=./k6/benchmarks/results/create_200.json
```

### PATCH update (fetch 200 ids once)

```powershell
k6 run .\k6\update-application.js `
  -e BASE_URL=http://localhost:3002/api/v1 `
  -e EMAIL=seed_metrics@example.com `
  -e PASSWORD=Password123! `
  -e DATASET=200 `
  -e PAGE_SIZE=100 `
  -e OUT_FILE=./k6/benchmarks/results/update_200.json
```

Repeat the same set after reseeding to 1000 with `DATASET=1000`.
