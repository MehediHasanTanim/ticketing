#!/usr/bin/env bash
# ONE COMMAND AFTER ANY CHANGE: rebuild both images, apply migrations, leave the
# cell UP, and verify it. `npm run refresh`.
#
# WHY THIS EXISTS. Claude edits this folder over the Cowork bridge, but that
# bridge is an isolated Linux VM with no Docker binary, no Docker socket and no
# route to this Mac - so Claude cannot rebuild the containers itself, and the
# alternatives (exposing the Docker daemon on TCP, or SSH into the host) would
# trade a convenience for a remote-code-execution surface on a laptop. This
# script is the other half of that deal: you run it, it does everything, and it
# writes `.dev-refresh.log` in the repo - which Claude CAN read over the bridge.
# So the loop closes without pasting terminal output back and forth.
#
# NOT `set -e`: a failure has to reach the diagnostics block, which is the whole
# point. Every step records its own status instead.
set -uo pipefail
cd "$(dirname "$0")/.."

LOG=".dev-refresh.log"          # gitignored by `*.log`
API_PORT="${API_PORT:-3001}"
CONSOLE_PORT="${CONSOLE_PORT:-8081}"
DB="${POSTGRES_DB:-jazzticketing}"
RECREATE=""
[ "${1:-}" = "--recreate" ] && RECREATE="--force-recreate"

# Everything from here goes to the terminal AND to the log.
exec > >(tee "${LOG}") 2>&1

head_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "== dev-refresh  head=${head_sha}  at=${started} =="

# The output of the CURRENT step, so a failure can report its immediate cause.
# Running this script for the first time failed on a blocked image pull, and the
# diagnostics printed five empty container-log sections while the one line that
# mattered ("Forbidden ... postgres:16-alpine") had scrolled past. The cause of a
# failure belongs at the TOP of the diagnostics, not in the scrollback.
# `mktemp -t NAME` is BSD-only in that form: macOS appends random characters,
# GNU coreutils rejects a template with no X's and returns nothing, which left
# this empty and silently disabled the diagnostics below. Explicit template,
# and a fallback, because a temp-file problem must never break a refresh.
STEP=$(mktemp "${TMPDIR:-/tmp}/dev-refresh.XXXXXX" 2>/dev/null) || STEP="/tmp/dev-refresh.$$"
trap 'rm -f "${STEP}"' EXIT

step() {                        # step <command...> - tees output, returns its status
  : > "${STEP}"
  "$@" 2>&1 | tee -a "${STEP}"
  return "${PIPESTATUS[0]}"
}

diagnostics() {
  # One block that answers "what went wrong, which service, and what does it
  # say" - so a single read of this log is enough to diagnose, instead of the
  # three round trips the console pid-file bug originally took.
  echo
  echo "---------------- diagnostics ----------------"
  if [ -s "${STEP}" ]; then
    echo "-- immediate cause (tail of the failing command)"
    tail -15 "${STEP}" | sed 's/^/   /'
    echo
  fi
  echo "-- docker compose ps"
  docker compose ps -a --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}' 2>&1 | sed 's/^/   /'

  # `migrate` exits by design, so it never shows as unhealthy in ps, and its log
  # is where a migration failure shows first. Always dump it when it has output.
  for svc in migrate api console postgres redis; do
    logs=$(docker compose logs --no-log-prefix --tail=40 "${svc}" 2>/dev/null)
    [ -n "${logs}" ] || continue          # no logs is not a section worth printing
    status=$(docker compose ps -a --format '{{.Service}}|{{.Status}}' 2>/dev/null \
             | awk -F'|' -v s="${svc}" '$1==s{print $2; exit}')
    echo
    echo "-- ${svc} (${status:-not created})"
    echo "${logs}" | sed 's/^/   /'
  done
  echo "---------------------------------------------"
  echo "REFRESH RESULT: fail  head=${head_sha}  at=${started}"
}

fail() { echo; echo "FAILED AT: $*"; diagnostics; exit 1; }

# ---- 0. is Docker even up? Say so plainly rather than emitting a wall of noise.
if ! docker info >/dev/null 2>&1; then
  echo
  echo "Docker is not reachable. Start Docker Desktop and run this again."
  echo "REFRESH RESULT: fail (docker not running)  head=${head_sha}  at=${started}"
  exit 1
fi

# ---- 1. rebuild BOTH images from source.
# `compose up` alone does not rebuild - that is how a fixed console image once
# went out three times without the fix in it.
echo
echo "== 1/5  rebuild both images =="
step docker compose build || fail "docker compose build"

# ---- 2. up, with migrations applied first.
# The `migrate` service runs `node dist/ops/migrate.js` and the api waits on
# `service_completed_successfully`, so migrations are applied from source on every
# refresh, in order, and skipped when the ledger says they are already in - which
# is what "if applicable" means here. There is no separate migrate command to
# remember, and no way to start the api against an un-migrated database.
echo
echo "== 2/5  start the cell (migrations run to completion first) =="
step docker compose up -d --wait --wait-timeout 180 ${RECREATE} \
  || fail "docker compose up (a service never became healthy)"

# ---- 3. verify what came up, rather than trusting that it did.
# From here the immediate cause is the assertion that failed, not a command's
# output, so the step buffer is cleared to keep the diagnostics honest.
: > "${STEP}"
echo
echo "== 3/5  verify =="
health=$(curl -fsS --max-time 10 "http://127.0.0.1:${API_PORT}/v1/health") \
  || fail "GET /v1/health (the api is up but not answering on ${API_PORT})"
echo "   api      ${health}"
case "${health}" in
  *'"status":"ok"'*) ;;
  *) fail "the api answers but reports a dependency unreachable: ${health}" ;;
esac

cfg=$(curl -fsS --max-time 10 "http://127.0.0.1:${CONSOLE_PORT}/config.json") \
  || fail "GET console /config.json on ${CONSOLE_PORT}"
echo "   console  ${cfg}"
curl -fsS --max-time 10 "http://127.0.0.1:${CONSOLE_PORT}/" | grep -q '<div id="root">' \
  || fail "the console is up but did not serve its app shell"

applied=$(docker compose exec -T postgres psql -U postgres -d "${DB}" -tAc \
  'SELECT count(*) FROM cell.schema_migrations' 2>/dev/null | tr -d '[:space:]')
echo "   db       ${applied:-0} migration(s) recorded"
[ "${applied:-0}" -ge 3 ] || fail "migrations are not recorded in cell.schema_migrations"

# The auth contract is designed ahead of the stories that build it, so every
# /auth operation must answer 501 with its owning story. A 401 or a 200 here means
# the contract and the running cell have parted company.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST \
  "http://127.0.0.1:${API_PORT}/v1/auth/device/sign-in" \
  -H 'content-type: application/json' -d '{}')
echo "   contract POST /v1/auth/device/sign-in -> ${code} (501 until Story 4.1)"
[ "${code}" = "501" ] || fail "an unbuilt /auth operation answered ${code}, not 501"

# The CONVERSE, which is the assertion that actually bites: Story 1.3 flipped six
# flags to built, so those operations must no longer answer 501. A flag flipped
# without a handler behind it would show up right here rather than in a review.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST \
  "http://127.0.0.1:${API_PORT}/v1/auth/sign-in" \
  -H 'content-type: application/json' -d '{"email":"nobody@example.test","password":"not-a-real-password"}')
echo "   contract POST /v1/auth/sign-in -> ${code} (401: built, and refusing)"
case "${code}" in
  401|429) ;;
  501) fail "POST /v1/auth/sign-in answered 501: the contract says Story 1.3 built it, and nothing is behind it" ;;
  *) fail "POST /v1/auth/sign-in answered ${code}; expected 401 for an unknown address" ;;
esac

# ---- 4. the suite and the gates, against the cell that is now up.
# REPORTED, NEVER FATAL. The point of this script is that its log closes the loop
# without pasting terminal output back and forth, and a test result is the most
# useful thing that log can carry. But a suite that fails for an environment
# reason must not make "did the containers rebuild" unanswerable, so this step
# prints its own result line and the refresh result stays what steps 1-3 decided.
#
# `.env` is loaded here and only here: the datastore URLs the suite needs point at
# the PUBLISHED host ports, which is a different thing from what the containers use
# over the compose network.
echo
echo "== 4/5  the suite and the gates =="
test_result="skipped"
if [ -f .env ]; then
  set -a; . ./.env; set +a

  # PREFLIGHT: can the test runner even start?
  #
  # The first real run of this step reported "the suite went red" when the suite had
  # not run at all - vitest could not load its native binding, because npm's
  # optional-dependency bug (npm/cli#4828) leaves `node_modules` without the binary for
  # this platform even though the lockfile lists it. The log then carried a stack trace
  # about `@rolldown/binding-wasm32-wasi` and no indication that the CODE was fine.
  #
  # "Your toolchain is incomplete" and "your code is broken" are the two things this
  # log exists to tell apart, so they get different words and different results.
  if ! npx vitest --version >/tmp/vitest-preflight.log 2>&1; then
    if grep -q "Cannot find native binding" /tmp/vitest-preflight.log; then
      test_result="blocked - vitest's native binding is missing for this platform.
                Nothing is wrong with the code. Fix it with:
                    rm -rf node_modules && npm ci
                (npm bug 4828: an optional platform binary the lockfile lists is not installed.)"
    else
      test_result="blocked - vitest will not start:"$'\n'"$(head -3 /tmp/vitest-preflight.log)"
    fi
  elif step npx vitest run; then
    if step npm run --silent gates; then test_result="ok"; else test_result="fail (a gate went red)"; fi
  else
    test_result="fail (the suite went red)"
  fi
  : > "${STEP}"
else
  echo "   no .env, so the datastore URLs the suite needs are not set - skipping"
fi
echo "   TEST RESULT: ${test_result}"

# ---- 5. leave it running and say where it is.
echo
echo "== 5/5  the cell is up =="
docker compose ps --format 'table {{.Service}}\t{{.Status}}' 2>&1 | sed 's/^/   /'
echo
echo "   console  http://localhost:${CONSOLE_PORT}"
echo "   api      http://localhost:${API_PORT}/v1/health"
echo "   docs     http://localhost:${API_PORT}/v1/docs"
echo
echo "REFRESH RESULT: ok  head=${head_sha}  at=${started}"
