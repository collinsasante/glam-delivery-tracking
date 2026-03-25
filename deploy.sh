#!/usr/bin/env bash
set -e

echo "▶ Building..."
npx @opennextjs/cloudflare build

echo "▶ Bundling worker into assets..."
rm -rf .open-next/assets/server-functions \
       .open-next/assets/.build \
       .open-next/assets/cloudflare \
       .open-next/assets/middleware \
       .open-next/assets/_worker.js

cp -r .open-next/server-functions .open-next/assets/server-functions
cp -r .open-next/.build          .open-next/assets/.build
cp -r .open-next/cloudflare      .open-next/assets/cloudflare
cp -r .open-next/middleware      .open-next/assets/middleware
cp    .open-next/worker.js       .open-next/assets/_worker.js

echo "▶ Deploying to Cloudflare Pages..."
cp wrangler.toml wrangler.toml.bak
cat > wrangler.toml << 'TOML'
name = "glam-delivery"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".open-next/assets"
TOML

wrangler pages deploy .open-next/assets --project-name glam-delivery

cp wrangler.toml.bak wrangler.toml
rm wrangler.toml.bak

echo "✅ Done — https://glam-delivery.pages.dev"
