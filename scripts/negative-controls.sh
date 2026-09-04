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

echo "== 14. auth contract: mark a designed-ahead operation as built, with no handler =="
# The whole risk of designing the auth surface ahead of the four stories that build
# it: a spec that claims an endpoint exists when nothing serves it. Flipping the
# flag must not be a way to mark work done.
cp contracts/openapi.yaml /tmp/openapi.nc.bak
python3 - <<'PY2'
import pathlib
p = pathlib.Path('contracts/openapi.yaml'); t = p.read_text()
p.write_text(t.replace('      x-story: "1.3"\n      x-implemented: false',
                       '      x-story: "1.3"\n      x-implemented: true', 1))
PY2
npm run --silent codegen >/dev/null 2>&1
expect_red "auth contract, unbuilt operation claimed built" npm run --silent smoke
cp /tmp/openapi.nc.bak contracts/openapi.yaml

echo "== 15. auth contract: designed-ahead operation with no owning story =="
# An unowned stub is one nobody will ever remove.
python3 - <<'PY2'
import pathlib
p = pathlib.Path('contracts/openapi.yaml'); t = p.read_text()
p.write_text(t.replace('      operationId: signInOnSharedDevice\n      tags: [auth]\n      x-story: "4.1"\n',
                       '      operationId: signInOnSharedDevice\n      tags: [auth]\n', 1))
PY2
npm run --silent codegen >/dev/null 2>&1
expect_red "auth contract, operation with no x-story" npm run --silent smoke
cp /tmp/openapi.nc.bak contracts/openapi.yaml

echo "== 16. auth contract: let an authenticated operation quietly opt out of auth =="
python3 - <<'PY2'
import pathlib
p = pathlib.Path('contracts/openapi.yaml'); t = p.read_text()
p.write_text(t.replace('      operationId: previewSla\n      tags: [sla]',
                       '      operationId: previewSla\n      tags: [sla]\n      security: []', 1))
PY2
npm run --silent codegen >/dev/null 2>&1
expect_red "auth contract, unlisted public operation" npm run --silent smoke
cp /tmp/openapi.nc.bak contracts/openapi.yaml
npm run --silent codegen >/dev/null 2>&1

echo "== 17. localisation contract: an error code with no Arabic message =="
# Arabic is a release language, not a later port (AD-12). A code with no message
# renders a BLANK label at the moment something has already gone wrong.
cp contracts/locale/ar.json /tmp/ar.nc.bak
python3 - <<'PY2'
import json
p = 'contracts/locale/ar.json'
d = json.load(open(p)); d.pop('error.too_many_attempts', None)
open(p, 'w', encoding='utf8').write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
PY2
expect_red "localisation contract, untranslated error code" node scripts/gate-codegen-drift.mjs
cp /tmp/ar.nc.bak contracts/locale/ar.json
npm run --silent codegen >/dev/null 2>&1

echo "== 18. surface separation: put an internal path in the CELL document =="
# FR-1 puts Tenant creation on a Jazzware-internal surface the product does not
# link to; AD-4 puts the control plane outside the cells. If an operator path can
# appear in the cell document, "provisioning grants Jazzware no standing access to
# tenant data" stops being enforceable and becomes a promise.
cp contracts/openapi.yaml /tmp/openapi.sep.bak
python3 - <<'PY2'
import pathlib
p = pathlib.Path('contracts/openapi.yaml'); t = p.read_text()
p.write_text(t.replace('\ncomponents:\n', """
  /operator/sign-in:
    post:
      operationId: operatorSignInLeak
      tags: [auth]
      x-story: "11.1"
      x-implemented: false
      security: []
      responses:
        "200": { description: leaked }
components:
""", 1))
PY2
expect_red "surface separation, internal path in the cell document" node scripts/gate-codegen-drift.mjs
cp /tmp/openapi.sep.bak contracts/openapi.yaml
npm run --silent codegen >/dev/null 2>&1

echo "== 19. surface separation: let both documents share one security scheme =="
# A shared scheme means one credential type addressing both surfaces, which is the
# permission-check-somebody-widens version of the separation instead of a different key.
cp contracts/control-plane-openapi.yaml /tmp/control.sep.bak
python3 - <<'PY2'
import pathlib
p = pathlib.Path('contracts/control-plane-openapi.yaml'); t = p.read_text()
p.write_text(t.replace('operatorBearerAuth:', 'bearerAuth:').replace('- operatorBearerAuth: []', '- bearerAuth: []'))
PY2
expect_red "surface separation, one scheme for both surfaces" node scripts/gate-codegen-drift.mjs
cp /tmp/control.sep.bak contracts/control-plane-openapi.yaml
npm run --silent codegen >/dev/null 2>&1

echo "== 20. privilege boundary: let the control-plane role reach the cell =="
# Story 11.1 AC-1 - an operator session grants NO read of tenant data - is enforced
# by `jt_control` having no grants in the cell schema. If a well-meaning future
# migration grants one, this is what says so.
psql "${DATABASE_URL_ADMIN}" -q -c 'GRANT USAGE ON SCHEMA cell TO jt_control; GRANT SELECT ON cell.events TO jt_control;' >/dev/null 2>&1
expect_red "privilege boundary, control-plane role reaching the cell" npx vitest run tests/provisioning.test.ts
psql "${DATABASE_URL_ADMIN}" -q -c 'REVOKE SELECT ON cell.events FROM jt_control; REVOKE USAGE ON SCHEMA cell FROM jt_control;' >/dev/null 2>&1

echo "== 21. privilege boundary: let the operator read back the invitation token =="
# The outbox is INSERT-only for `jt_control` so that provisioning cannot be turned
# into a way into the customer's first administrator account (FR-1).
psql "${DATABASE_URL_ADMIN}" -q -c 'GRANT SELECT ON control_plane.outbox TO jt_control;' >/dev/null 2>&1
expect_red "privilege boundary, operator reading the invitation token" npx vitest run tests/provisioning.test.ts
psql "${DATABASE_URL_ADMIN}" -q -c 'REVOKE SELECT ON control_plane.outbox FROM jt_control;' >/dev/null 2>&1

echo "== 22. deactivate-never-delete: drop the trigger that refuses a Tenant delete =="
psql "${DATABASE_URL_ADMIN}" -q -c 'DROP TRIGGER tenants_no_delete ON control_plane.tenants;' >/dev/null 2>&1
expect_red "deactivate never delete (Story 1.1 AC-4)" npx vitest run tests/provisioning.test.ts
psql "${DATABASE_URL_ADMIN}" -q -c 'CREATE TRIGGER tenants_no_delete BEFORE DELETE ON control_plane.tenants FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_tenant_delete();' >/dev/null 2>&1

echo "== 23. cross-surface tokens: make the two surfaces share one secret =="
# The audience check is what survives this. If it is ever removed, an operator
# token becomes a cell token the moment someone misconfigures the secrets alike.
expect_red "cross-surface tokens, shared secret defeated by the audience check" \
  env CONTROL_PLANE_TOKEN_SECRET="${FIXTURE_AUTH_SECRET:?set it in .env}" \
  node -e '
    const { mintOperatorToken } = require("./dist/edge/src/control-plane/operator-auth.js");
    const { resolvePrincipal } = require("./dist/edge/src/auth.js");
    process.env.FIXTURE_AUTH = "1";
    const t = mintOperatorToken({ operatorId: "01O-x", sessionId: "01S-x", expiresAt: new Date(Date.now() + 60000) });
    // With the secrets identical the signature verifies, so ONLY the audience
    // check can refuse it. If this resolves, the cell has accepted an operator.
    if (resolvePrincipal("Bearer " + t)) { console.error("the cell accepted an operator token"); process.exit(0); }
    process.exit(1);
  '

echo "== 24. docs surfaces: serve the INTERNAL document under the cell's prefix =="
# A docs page is the easiest place for the two surfaces to bleed together, because
# it is the one place they are the same KIND of thing. If /v1/docs ever publishes
# the Jazzware-internal API, every hotel customer can read it.
cp edge/src/docs.ts /tmp/docs.nc.bak
python3 - <<'PY2'
import pathlib
p = pathlib.Path('edge/src/docs.ts'); t = p.read_text()
p.write_text(t.replace("  document: OPENAPI_DOCUMENT,", "  document: CONTROL_PLANE_OPENAPI_DOCUMENT,", 1))
PY2
CONTROL_PLANE_DOCS=1 expect_red "docs surfaces, internal document under the cell prefix" \
  npx vitest run tests/provisioning.test.ts
cp /tmp/docs.nc.bak edge/src/docs.ts

echo "== 25. secrets fail closed: reinstate a fallback signing secret =="
# Both token secrets used to fall back to a constant. Untidy while the repository
# was private; a hole the moment it went public, because an operator token signs the
# surface that provisions customers - a published fallback is a signing key
# everybody has. The check must THROW when the variable is unset.
#
# Exercised through the exported check rather than by booting a server: the first
# version of this control backgrounded a process inside `sh -c`, so the subshell
# never exited and the whole suite hung. A control that cannot finish is worse than
# no control.
cp edge/src/control-plane/operator-auth.ts /tmp/opauth.nc.bak
python3 - <<'PY2'
import pathlib, re
p = pathlib.Path('edge/src/control-plane/operator-auth.ts'); t = p.read_text()
t = re.sub(r"  if \(!v \|\| v\.length === 0\) \{\n(?:.*\n)*?  \}\n",
           "  if (!v || v.length === 0) return 'story-11-1-control-plane-local-only';\n",
           t, count=1)
p.write_text(t)
PY2
npm run --silent build >/dev/null 2>&1
expect_red "secrets fail closed, no fallback signing key" \
  env -u CONTROL_PLANE_TOKEN_SECRET node -e '
    const { controlPlaneSecretOrThrow } = require("./dist/edge/src/control-plane/operator-auth.js");
    try {
      controlPlaneSecretOrThrow();
      console.error("handed out a signing secret with the variable unset");
      process.exit(1);          // the check FAILED - which is what expect_red wants
    } catch {
      process.exit(0);          // correctly refused
    }'
cp /tmp/opauth.nc.bak edge/src/control-plane/operator-auth.ts
npm run --silent build >/dev/null 2>&1

echo
echo "negative controls: ${pass} correctly went red, ${fail} did not, ${unverified} unverifiable here"
[ "${fail}" -eq 0 ]
