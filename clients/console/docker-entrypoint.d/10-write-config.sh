#!/bin/sh
# One image, many environments: write the runtime config the app fetches.
# nginx:alpine runs every executable in /docker-entrypoint.d before starting.
set -eu
cat > /usr/share/nginx/html/config.json <<JSON
{
  "apiBaseUrl": "${API_BASE_URL}",
  "cellName": "${CELL_NAME}"
}
JSON
echo "[console] wrote /config.json (apiBaseUrl=${API_BASE_URL} cell=${CELL_NAME})"
