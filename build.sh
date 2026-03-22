#!/bin/bash
set -e
npx @opennextjs/cloudflare build

# Wrap the OpenNext worker with logging + error catching.
# If the worker crashes, CF Pages returns a visible 500 instead of a silent 404.
node << 'EOF'
const fs = require("fs");
const code = fs.readFileSync(".open-next/worker.js", "utf8");

// Find the last `export default` and replace with a named var, then re-export a wrapper.
const lastIdx = code.lastIndexOf("export default ");
if (lastIdx === -1) {
  console.log("[build] No 'export default' found — copying worker as-is");
  fs.copyFileSync(".open-next/worker.js", ".open-next/assets/_worker.js");
  process.exit(0);
}

const before = code.slice(0, lastIdx);
const after   = code.slice(lastIdx + "export default ".length).replace(/;\s*$/, "");

const wrapped = `${before}
var __inner = ${after};
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    console.log("[worker] " + request.method + " " + path);
    try {
      const res = await __inner.fetch(request, env, ctx);
      console.log("[worker] -> " + res.status + " " + path);
      return res;
    } catch (e) {
      console.error("[worker] CRASH on " + path + ": " + e.message);
      console.error("[worker] stack: " + e.stack);
      return new Response(
        JSON.stringify({ error: e.message, path }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
  }
};
`;

fs.writeFileSync(".open-next/assets/_worker.js", wrapped);
console.log("[build] Worker wrapped with logging (" + wrapped.length + " bytes)");
EOF
