# backend/Dockerfile
# Build context should be repo root:
# docker build -f backend/Dockerfile -t career-tracker-api .

# --- Build stage: compile the app ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

# For shared packages:
COPY packages ./packages

# Install all dependencies
RUN npm ci

# Copy backend source and build
COPY backend ./backend
RUN npm run build --workspace=backend

# Generate Prisma client (ensures runtime has what it needs to talk to the DB)
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# --- Runtime stage ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy whats needed from build stage (node_modules + built backend)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json

# Cloud Run uses PORT=8080 by default; your server reads process.env.PORT.
EXPOSE 8080

# Run migrations on startup, then start server
# (Simple MVP approach; later we can move migrations to a separate deploy step.)
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node dist/server.js"]
