#!/bin/bash
set -e
npx @opennextjs/cloudflare build

# CF Pages (wrangler) bundles _worker.js with esbuild when it finds it in the output dir.
# OpenNext produces a multi-file worker — copy the entry point AND all its module
# dependencies into the assets dir so wrangler can resolve the relative imports.
cp .open-next/worker.js .open-next/assets/_worker.js
for dir in cloudflare middleware .build server-functions; do
  [ -d ".open-next/$dir" ] && cp -r ".open-next/$dir" ".open-next/assets/$dir"
done
echo "[build] Copied worker.js and sibling modules into assets dir"
