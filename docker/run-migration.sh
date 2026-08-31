#!/usr/bin/env bash
# Runs a one-off Node script (the Airtable/image migration scripts) attached to
# the same Docker network as the running stack, so it can reach the `db`
# service by its internal hostname exactly as .env.production's DATABASE_URL
# expects — without ever exposing Postgres to the host network. Mounts the
# real repo source (the production `app` image intentionally doesn't include
# scripts/ or dev dependencies like tsx/dotenv).
#
# Usage: docker/run-migration.sh scripts/migrate-to-postgres.ts
set -euo pipefail

SCRIPT="${1:?Usage: $0 <path-to-script.ts>}"

docker compose --env-file .env.production --profile tools run --rm migrate \
  "NODE_ENV=development npm ci && DOTENV_CONFIG_PATH=.env.production node --conditions=react-server --import tsx -r dotenv/config '$SCRIPT'"
