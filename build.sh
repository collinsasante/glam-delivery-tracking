#!/bin/bash
set -e
npx @opennextjs/cloudflare build

# Patch: OpenNext 1.17.1 doesn't know about the prefetch-hints.json manifest
# introduced in Next.js 16. Its loadManifest() throws "Unexpected call!" for it.
# Find the generated worker chunk that contains that throw and make it return {}
# for prefetch-hints so the server can initialise without crashing.
node << 'PATCHEOF'
const fs = require("fs");
const path = require("path");

const dirs = [
  ".open-next/server-functions/default",
  ".open-next",
];

let patched = false;
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(js|mjs)$/.test(file)) continue;
    const fp = path.join(dir, file);
    let code;
    try { code = fs.readFileSync(fp, "utf8"); } catch { continue; }
    if (!code.includes("Unexpected loadManifest")) continue;

    const patched_code = code.replace(
      /throw new Error\(`Unexpected loadManifest\(\$\{([a-zA-Z_$][\w$]*)\}\) call!`\)/,
      (match, v) =>
        `if (${v} && ${v}.includes("prefetch-hints")) { return {}; } ${match}`
    );

    if (patched_code !== code) {
      fs.writeFileSync(fp, patched_code);
      console.log("[build] Patched prefetch-hints.json in", fp);
      patched = true;
    }
  }
}
if (!patched) {
  console.error("[build] ERROR: Could not find loadManifest throw to patch");
  process.exit(1);
}
PATCHEOF

# Copy the OpenNext worker entry point and all its sibling module dependencies
# into the assets dir so wrangler can resolve relative imports when bundling.
cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

# Wrap default export with error catching so crashes surface as JSON 500.
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
        console.error("[worker] 500 body for " + path + ": " + body.slice(0, 1000));
      }
      return res;
    } catch (e) {
      console.error("[worker] EXCEPTION on " + path + ": " + e.message);
      console.error(e.stack ?? "(no stack)");
      return new Response(
        JSON.stringify({ error: e.message, stack: e.stack, path }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  },
};
EOF

echo "[build] Done"
