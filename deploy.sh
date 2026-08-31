#!/usr/bin/env bash
# Deploy the latest main branch to this VPS. Run from the app directory on the server.
set -euo pipefail

echo "▶ Pulling latest..."
git pull origin main

echo "▶ Building app image..."
docker compose --env-file .env.production build app

echo "▶ Restarting app (db/nginx/certbot untouched)..."
docker compose --env-file .env.production up -d --no-deps app

echo "✅ Done."
