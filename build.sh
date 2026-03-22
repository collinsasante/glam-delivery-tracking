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

node << 'POSTPATCH'
const fs = require("fs");
const fp = ".open-next/server-functions/default/handler.mjs";
let code = fs.readFileSync(fp, "utf8");
let changed = 0;

// 1. Make loadManifest never throw — return {} for unknown manifests and log them.
code = code.replace(
  /throw new Error\(`Unexpected loadManifest\(\$\{([a-zA-Z_$][\w$]*)\}\) call!`\)/,
  (_, v) => `console.error("[loadManifest] unknown: " + ${v}); return {}`
);

// 2. Expose the real error instead of swallowing it as "Internal Server Error".
//    Next.js calls: this.logError(err), res.statusCode=500, res.body("Internal Server Error").send()
//    We replace the body with the actual error message so we can see it in the browser.
const before = code;
code = code.replace(
  /this\.logError\(\(0,[^)]+\)\(err\)\),res\.statusCode=500,res\.body\("Internal Server Error"\)\.send\(\)/,
  `this.logError((0,_iserror.getProperError)(err)),console.error("[next-error]",err),res.statusCode=500,res.body(JSON.stringify({nextError:String(err),stack:err&&err.stack})).send()`
);
if (code !== before) {
  console.log("[post-build] patched Internal Server Error to expose real error");
  changed++;
} else {
  console.warn("[post-build] WARNING: could not patch Internal Server Error handler — pattern not matched");
}

fs.writeFileSync(fp, code);
console.log("[post-build] done, changes:", changed);
POSTPATCH

cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

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
        console.error("[worker] 500 body: " + body.slice(0, 1000));
        return new Response(body, { status: 500, headers: { "content-type": "application/json" } });
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
