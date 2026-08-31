# Multi-stage build producing a minimal runtime image from Next's `output: "standalone"` bundle.
# Build-time env vars below only need to be *present* (postgres.js/S3Client don't connect eagerly
# at import time) — they don't need to point at anything real during `next build`. Real values are
# supplied at container start via docker-compose's `env_file: .env.production`.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ARG AWS_REGION=us-east-1
ARG S3_BUCKET_NAME=placeholder
ARG CLOUDFRONT_DOMAIN=placeholder.invalid
ARG AUTH_SECRET=build-time-placeholder-not-used-at-runtime
ENV DATABASE_URL=$DATABASE_URL \
    AWS_REGION=$AWS_REGION \
    S3_BUCKET_NAME=$S3_BUCKET_NAME \
    CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN \
    AUTH_SECRET=$AUTH_SECRET

RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
