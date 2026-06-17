#!/usr/bin/env bash
# Production entrypoint for the home-server CI/CD pipeline.
# Runs DB migrations against DATABASE_URL, then starts the server.
# NODE_ENV / PORT / DATABASE_URL / HOST_PIN come from the process environment
# (systemd EnvironmentFile = /srv/apps/place-a-bet/shared/.env).
set -euo pipefail
cd "$(dirname "$0")/.."
node server/dist/db/migrate.js
exec node server/dist/index.js
