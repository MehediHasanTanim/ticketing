# NO `# syntax=` DIRECTIVE, DELIBERATELY. Pinning the Dockerfile frontend makes
# every build depend on pulling docker/dockerfile from Docker Hub, and this file
# uses no frontend-version-specific syntax (no heredocs, no RUN --mount). Paying a
# hard registry dependency for a feature we do not use breaks offline, air-gapped
# and mirrored builds for nothing. Add it back the day a 1.x-only feature is needed.
#
# JazzTicketing API - one image per cell (AD-4). Story 1.0 / AC-5.
#
# The SAME image runs the API and the migrations, so a deploy can never apply
# migrations from a different build than the code that will read them:
#   api      -> node dist/edge/src/main.js   (default CMD)
#   migrate  -> node dist/ops/migrate.js
#   rebuild  -> node dist/app/src/rebuild-projections.js
#
# [UNVERIFIED] Base image tags are NOT digest-pinned. Every container registry is
# blocked by egress policy in the build environment where this was written, so no
# digest could be retrieved. Pin these by digest before any real deployment - an
# unpinned tag is a supply-chain hole, not a style preference. See
# docs/stack-versions.md.

# The base image is a build ARG so a mirrored, air-gapped or offline build can
# substitute one without forking this file. The DEFAULT is the real base; nothing
# about a normal `docker build .` changes.
ARG NODE_IMAGE=node:22-alpine

# ---------------------------------------------------------------- deps (prod only)
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ------------------------------------------------------------------------- build
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY core ./core
COPY adapters ./adapters
COPY app ./app
COPY edge ./edge
COPY ops ./ops
COPY contracts ./contracts
RUN npx tsc -p tsconfig.json

# ----------------------------------------------------------------------- runtime
FROM ${NODE_IMAGE} AS runtime
# PORT is the port the API LISTENS on, in a container or on a host. 3001 rather
# than 3000 at Tanim's request (2026-09-03).
ENV NODE_ENV=production \
    PORT=3001 \
    FIXTURE_AUTH=0
WORKDIR /app

# Migrations are read from source at runtime by ops/migrate.ts, so the .sql files
# must be in the image - not just their compiled loader.
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node ops/migrations ./ops/migrations
COPY --chown=node:node package.json ./

# Never root. The image needs no write access to its own filesystem, so it also
# runs correctly with readOnlyRootFilesystem in Kubernetes.
USER node

EXPOSE 3001

# Health is the only unauthenticated route, which is what makes it usable here.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/v1/health').then(r=>r.json()).then(b=>process.exit(b.status==='ok'?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/edge/src/main.js"]
