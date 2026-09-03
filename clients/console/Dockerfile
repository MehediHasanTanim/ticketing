# NO `# syntax=` DIRECTIVE, DELIBERATELY. Pinning the Dockerfile frontend makes
# every build depend on pulling docker/dockerfile from Docker Hub, and this file
# uses no frontend-version-specific syntax (no heredocs, no RUN --mount). Paying a
# hard registry dependency for a feature we do not use breaks offline, air-gapped
# and mirrored builds for nothing. Add it back the day a 1.x-only feature is needed.
#
# JazzTicketing console - static build served by nginx. Story 1.0 / AC-5.
#
# ONE image, MANY environments. The API base URL is NOT baked in at build time;
# the entrypoint writes /config.json from environment at container start and the
# app reads it. Baking it in would mean one image per environment, which is a
# pattern that is painful to undo once deploy pipelines depend on it.
#
# [UNVERIFIED] Base image tags are not digest-pinned - registries were blocked
# where this was written. Pin by digest before deploying.

# Both bases are build ARGs so a mirrored or air-gapped build can substitute them.
# The defaults are the real bases.
ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY scripts ./scripts
# AD-12: the directional lint runs INSIDE the image build, so a physical
# left/right property cannot reach a built artifact even if CI is skipped.
# Type-check AND lint inside the image build. `vite build` alone does not
# type-check, which let a React 19 breaking change (the global JSX namespace was
# removed) sit unnoticed in Story 1.0 until the container work ran tsc.
RUN node scripts/lint-logical-direction.mjs \
 && npx tsc -b \
 && npx vite build

FROM ${NGINX_IMAGE} AS runtime
ENV API_BASE_URL=/v1 \
    CELL_NAME=unknown

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/10-write-config.sh /docker-entrypoint.d/10-write-config.sh

# Run as the nginx user on 8081 (a port above 1024, so no NET_BIND_SERVICE
# capability is needed). The port lives in nginx.conf - there is no sed rewriting a
# default config, because this image ships its own.
RUN chmod +x /docker-entrypoint.d/10-write-config.sh \
 && mkdir -p /var/cache/nginx /var/run \
 && chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html /etc/nginx/conf.d

USER nginx
EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
