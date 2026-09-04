# syntax=docker/dockerfile:1

# ---- deps: install and generate Prisma client on the target OS ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

# ---- builder: compile the Next.js standalone server ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runner: minimal runtime image ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Next.js standalone output (traced server + minimal node_modules).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure the Prisma client + query engine are present in the runtime image.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Local-storage driver writes here; owned by the runtime user. (In AWS the S3
# driver is used instead and this stays empty.)
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000
# Force bind to 0.0.0.0 — container runtimes (Fargate/App Runner) set HOSTNAME to
# the container hostname, which would make Next's standalone server bind only to
# that interface and fail platform health checks.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
