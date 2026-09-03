#!/usr/bin/env bash
# Story 1.0 / AC-5: prove the CONTAINERISED cell runs, not just the processes.
#
# Builds both images, stands the cell up, waits for health, and asserts the API
# reports every dependency reachable and the console serves its runtime config.
# Used by CI and by anyone who wants the cell without installing Postgres.
set -euo pipefail
cd "$(dirname "$0")/.."

API_PORT="${API_PORT:-3001}"
CONSOLE_PORT="${CONSOLE_PORT:-8081}"
COMPOSE="docker compose"

cleanup() {
  echo "-- tearing the cell down"
  ${COMPOSE} down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== 1. build both images =="
${COMPOSE} build

echo "== 2. stand the cell up (migrations run to completion first) =="
${COMPOSE} up -d --wait --wait-timeout 180

echo "== 3. the API reports every dependency reachable =="
health=$(curl -fsS "http://127.0.0.1:${API_PORT}/v1/health")
echo "   ${health}"
echo "${health}" | grep -q '"status":"ok"'        || { echo "FAIL: status not ok"; exit 1; }
echo "${health}" | grep -q '"eventStore":"ok"'    || { echo "FAIL: event store unreachable"; exit 1; }
echo "${health}" | grep -q '"cache":"ok"'         || { echo "FAIL: cache unreachable"; exit 1; }

echo "== 4. the API runs as a non-root user =="
uid=$(${COMPOSE} exec -T api id -u)
[ "${uid}" != "0" ] || { echo "FAIL: API container is running as root"; exit 1; }
echo "   uid=${uid}"

echo "== 5. the API filesystem is read-only =="
if ${COMPOSE} exec -T api sh -c 'touch /app/should-not-be-writable' 2>/dev/null; then
  echo "FAIL: root filesystem is writable"; exit 1
fi
echo "   read-only confirmed"

echo "== 6. the console serves its runtime config and its app shell =="
cfg=$(curl -fsS "http://127.0.0.1:${CONSOLE_PORT}/config.json")
echo "   ${cfg}"
echo "${cfg}" | grep -q 'apiBaseUrl' || { echo "FAIL: console config missing apiBaseUrl"; exit 1; }
curl -fsS "http://127.0.0.1:${CONSOLE_PORT}/" | grep -q '<div id="root">' \
  || { echo "FAIL: console did not serve the app shell"; exit 1; }
curl -fsS "http://127.0.0.1:${CONSOLE_PORT}/healthz" | grep -q 'ok' \
  || { echo "FAIL: console healthz"; exit 1; }

echo "== 7. migrations were applied from source, exactly once =="
applied=$(${COMPOSE} exec -T postgres psql -U postgres -d "${POSTGRES_DB:-jazzticketing}" -tAc \
  'SELECT count(*) FROM cell.schema_migrations')
echo "   ${applied} migration(s) recorded"
[ "${applied}" -ge 3 ] || { echo "FAIL: migrations not applied"; exit 1; }

echo
echo "compose smoke: the containerised cell runs"
