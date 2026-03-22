#!/bin/bash
set -e

# Patch OpenNext 1.17.1 to bundle Next.js 16's prefetch-hints.json manifest.
# The glob in load-manifest.js only matches *-manifest.json and
# required-server-files.json — prefetch-hints.json is silently excluded, which
# causes every route to crash with "Unexpected loadManifest() call!".
node -e "
const fs = require('fs');
const f = 'node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js';
const src = fs.readFileSync(f, 'utf8');
const patched = src.replace(
  '{*-manifest,required-server-files}.json',
  '{*-manifest,required-server-files,prefetch-hints}.json'
);
if (patched === src) { console.error('[pre-build] patch not applied — pattern not found'); process.exit(1); }
fs.writeFileSync(f, patched);
console.log('[pre-build] OpenNext patched to include prefetch-hints.json');
"

npx @opennextjs/cloudflare build

# Copy the OpenNext worker entry point and all its sibling module dependencies
# into the assets dir so wrangler can resolve relative imports when bundling.
cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

# Thin wrapper: catch unhandled exceptions and log 500 bodies for debugging.
cat > .open-next/assets/_worker.js << 'EOF'
import inner from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    console.log("[worker] " + request.method + " " + path);
    try {
      const res = await inner.fetch(request, env, ctx);
      console.log("[worker] -> " + res.status + " " + path);
      if (res.status >= 500) {
        const body = await res.clone().text();
        console.error("[worker] 500 body: " + body.slice(0, 500));
      }
      return res;
    } catch (e) {
      console.error("[worker] EXCEPTION: " + e.message + "\n" + e.stack);
      return new Response(
        JSON.stringify({ error: e.message, path }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  },
};
EOF

echo "[build] Done"
