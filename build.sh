#!/bin/bash
set -e
npx @opennextjs/cloudflare build

# Copy the OpenNext worker entry point and all its sibling module dependencies
# into the assets dir so wrangler can resolve relative imports when bundling.
cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

# Wrap the default export with error catching so crashes return JSON 500
# instead of an opaque Cloudflare Error 1101.
cat > .open-next/assets/_worker.js << 'EOF'
import inner from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    console.log("[worker] " + request.method + " " + path);
    try {
      const res = await inner.fetch(request, env, ctx);
      console.log("[worker] -> " + res.status + " " + path);
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

echo "[build] _worker.js wrapper written"
