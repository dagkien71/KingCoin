#!/bin/sh
set -e
cd /app
node scripts/render-bootstrap.js
exec node dist/main.js
