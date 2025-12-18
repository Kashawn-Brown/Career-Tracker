## Backend (API)
- Built a **Fastify + TypeScript** REST API with **JWT auth**, **rate limiting**, and **TypeBox validation**
- Implemented **user-scoped CRUD** for job applications with **pagination, sorting, status filters, and search**
- Used **Prisma + PostgreSQL**, including transactional pagination (`count + items`) for consistent list results under write load
- Load tested with **k6** (10 VUs, 20s, local):  
  - `GET /applications` p95 **~13-20ms** on **200–1000** records  
  - `POST /applications` p95 **~18-22ms**  
  - `PATCH /applications/:id` p95 **~28-30ms**  
  - **0% request failures** across runs  
- Next: deploy to Cloud Run + Cloud SQL and repeat benchmarks for production-like metrics

---
_Last updated: 2025-12-18_