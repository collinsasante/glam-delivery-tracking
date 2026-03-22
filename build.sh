#!/bin/bash
set -e

# Patch OpenNext 1.17.1 to bundle Next.js 16's prefetch-hints.json manifest.
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

# Post-build safety patch: replace the final 'Unexpected loadManifest' throw in
# handler.mjs with a console.error + return {} so unknown manifests never crash
# the server.  Also adds console.log so we can see every manifest request in
# CF Pages real-time logs.
node << 'POSTPATCH'
const fs = require("fs");
const fp = ".open-next/server-functions/default/handler.mjs";
let code = fs.readFileSync(fp, "utf8");

// Replace the throw with a safe fallback so any unknown manifest returns {} instead of crashing.
const before = code;
code = code.replace(
  /throw new Error\(`Unexpected loadManifest\(\$\{([a-zA-Z_$][\w$]*)\}\) call!`\)/,
  (_, v) => `console.error("[loadManifest] unknown manifest requested: " + ${v}); return {}`
);

if (code === before) {
  console.log("[post-build] WARNING: could not find loadManifest throw — may already be patched");
} else {
  fs.writeFileSync(fp, code);
  console.log("[post-build] loadManifest patched: unknown manifests now return {} instead of throwing");
}
POSTPATCH

# Copy the OpenNext worker entry point and all its sibling module dependencies
# into the assets dir so wrangler can resolve relative imports when bundling.
cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

# Thin wrapper: expose exceptions and 500 bodies for debugging.
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
        return new Response(
          JSON.stringify({ path, error: body.slice(0, 500) }),
          { status: 500, headers: { "content-type": "application/json" } }
        );
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
