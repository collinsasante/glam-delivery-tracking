#!/bin/bash
set -e
npx @opennextjs/cloudflare build

cp .open-next/worker.js .open-next/assets/worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done

cat > .open-next/assets/_worker.js << 'EOF'
import inner from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    try {
      return await inner.fetch(request, env, ctx);
    } catch (e) {
      console.error("[worker] " + request.method + " " + new URL(request.url).pathname + " — " + e.message);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
};
EOF
