#!/usr/bin/env bash
# Story 1.0 / AC-6: prove each gate can go RED.
#
# A gate that has never failed is not known to work. This script breaks each gate
# deliberately, asserts it fails, and restores the file. Run it whenever a gate is
# changed; the output belongs in the story's Dev Agent Record.
set -uo pipefail
cd "$(dirname "$0")/.."

pass=0; fail=0; unverified=0
restore() { git checkout -- "$1" 2>/dev/null || true; }

expect_red() { # name, command
  local name="$1"; shift
  if "$@" >/tmp/nc.log 2>&1; then
    echo "  NEGATIVE CONTROL FAILED: ${name} stayed GREEN while broken"
    sed -n '1,12p' /tmp/nc.log | sed 's/^/      /'
    fail=$((fail+1))
  else
    echo "  ok  ${name} went RED when broken"
    pass=$((pass+1))
  fi
}

echo "== 1. boundary lint: make core/ import an adapter =="
cat > core/src/__negative_control.ts <<'EOF'
import { getPool } from '../../adapters/src/postgres/pool';
export const broken = getPool;
EOF
expect_red "boundary lint (AC-1)" npm run --silent gate:boundaries
rm -f core/src/__negative_control.ts

echo "== 2. codegen drift: hand-edit a generated binding =="
if [ -f contracts/generated/ts/errors.ts ]; then
  printf '\nexport type HandEdited = true;\n' >> contracts/generated/ts/errors.ts
  expect_red "codegen drift (AC-2)" npm run --silent gate:codegen-drift
  restore contracts/generated/ts/errors.ts
else
  echo "  SKIP  run 'npm run codegen' first"
fi

echo "== 3. SLA fixtures: break the TypeScript fold =="
cp core/src/job/sla.ts /tmp/sla.ts.bak
sed -i 's/const elapsedMs = Math.max(0, end - start);/const elapsedMs = Math.max(0, end - start) + 1;/' core/src/job/sla.ts
expect_red "SLA fixtures, TypeScript half (AC-3)" node scripts/gate-sla-fixtures.mjs --only=ts
cp /tmp/sla.ts.bak core/src/job/sla.ts

echo "== 4. SLA fixtures: break the Dart port =="
if command -v dart >/dev/null 2>&1; then
  cp clients/mobile/lib/sla/sla_fold.dart /tmp/sla_fold.dart.bak
  sed -i 's/const pausedMs = 0;/const pausedMs = 60000;/' clients/mobile/lib/sla/sla_fold.dart
  expect_red "SLA fixtures, Dart half (AC-3)" node scripts/gate-sla-fixtures.mjs --only=dart
  cp /tmp/sla_fold.dart.bak clients/mobile/lib/sla/sla_fold.dart
else
  # Do NOT count this as a pass. With no Dart SDK the gate is already red for a
  # different reason, so breaking the port proves nothing. Report it unverified.
  echo "  UNVERIFIED  Dart half: no Dart SDK on PATH, so this control is vacuous."
  unverified=$((unverified+1))
fi

echo "== 5. isolation: disable row-level security =="
psql "${DATABASE_URL_ADMIN}" -q -c 'ALTER TABLE cell.fixture_notes DISABLE ROW LEVEL SECURITY;' >/dev/null 2>&1
expect_red "cross-tenant isolation (AC-4)" npm run --silent gate:isolation
psql "${DATABASE_URL_ADMIN}" -q -c 'ALTER TABLE cell.fixture_notes ENABLE ROW LEVEL SECURITY;' >/dev/null 2>&1

echo "== 6. control plane: add a guest-identifying column =="
psql "${DATABASE_URL_ADMIN}" -q -c 'ALTER TABLE control_plane.properties ADD COLUMN guest_name text;' >/dev/null 2>&1
expect_red "control plane no guest data (AC-5)" npm run --silent gate:control-plane
psql "${DATABASE_URL_ADMIN}" -q -c 'ALTER TABLE control_plane.properties DROP COLUMN guest_name;' >/dev/null 2>&1

echo "== 7. directional lint: add a physical property to the console =="
if [ -d clients/console/node_modules ]; then
  printf '\n.negative-control { margin-left: 4px; }\n' >> clients/console/src/tokens.css
  expect_red "logical direction (AD-12)" bash -c 'cd clients/console && node scripts/lint-logical-direction.mjs'
  restore clients/console/src/tokens.css
else
  echo "  SKIP  clients/console dependencies not installed"
fi

echo "== 8. container gate: drop USER from the api image =="
cp Dockerfile /tmp/Dockerfile.bak
sed -i '/^USER node$/d' Dockerfile
expect_red "container gate, non-root (AC-5)" node scripts/gate-containers.mjs
cp /tmp/Dockerfile.bak Dockerfile

echo "== 9. container gate: let the api start before migrations finish =="
cp docker-compose.yml /tmp/compose.bak
sed -i 's/        condition: service_completed_successfully/        condition: service_started/' docker-compose.yml
expect_red "container gate, migration ordering (AC-5)" node scripts/gate-containers.mjs
cp /tmp/compose.bak docker-compose.yml

echo "== 10. container gate: hard-code a published host port =="
cp docker-compose.yml /tmp/compose.ports.bak
sed -i 's|      - "${CONSOLE_PORT:-8081}:8081"|      - "8081:8081"|' docker-compose.yml
expect_red "container gate, no hard-coded host ports (AC-5)" node scripts/gate-containers.mjs
cp /tmp/compose.ports.bak docker-compose.yml

echo "== 11. built-artifact gate: reintroduce a compile-time-only path alias =="
cp edge/src/server.ts /tmp/server.alias.bak
cp tsconfig.json /tmp/tsconfig.alias.bak
sed -i "s|from '../../adapters/src/postgres/pool'|from '@adapters/postgres/pool'|" edge/src/server.ts
node -e "
const fs=require('fs'); const d=JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
d.compilerOptions.baseUrl='.'; d.compilerOptions.paths={'@adapters/*':['adapters/src/*']};
fs.writeFileSync('tsconfig.json', JSON.stringify(d,null,2)+'\n');"
expect_red "built artifact runs (AC-5)" node scripts/gate-built-artifact.mjs
cp /tmp/server.alias.bak edge/src/server.ts
cp /tmp/tsconfig.alias.bak tsconfig.json

echo "== 12. container gate: make two services build the same image tag =="
cp docker-compose.yml /tmp/compose.race.bak
python3 - <<'PY'
import pathlib
p=pathlib.Path('docker-compose.yml'); t=p.read_text()
t=t.replace("""  migrate:
    image: jazzticketing/api:dev
    pull_policy: never""","""  migrate:
    build:
      context: .
      target: runtime
    image: jazzticketing/api:dev""")
p.write_text(t)
PY
expect_red "container gate, no image-tag race (AC-5)" node scripts/gate-containers.mjs
cp /tmp/compose.race.bak docker-compose.yml

echo "== 13. container gate: chown /var/run instead of the real pid path =="
cp clients/console/Dockerfile /tmp/console.pid.bak
python3 - <<'PY'
import pathlib,re
p=pathlib.Path('clients/console/Dockerfile'); t=p.read_text()
t=re.sub(r"RUN chmod \+x /docker-entrypoint\.d/10-write-config\.sh \\\n(?:.*\n)*? && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html /etc/nginx/conf\.d",
 "RUN chmod +x /docker-entrypoint.d/10-write-config.sh \\\n && mkdir -p /var/cache/nginx /var/run \\\n && chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html /etc/nginx/conf.d", t)
p.write_text(t)
PY
expect_red "container gate, nginx pid path (AC-5)" node scripts/gate-containers.mjs
cp /tmp/console.pid.bak clients/console/Dockerfile

echo
echo "negative controls: ${pass} correctly went red, ${fail} did not, ${unverified} unverifiable here"
[ "${fail}" -eq 0 ]
