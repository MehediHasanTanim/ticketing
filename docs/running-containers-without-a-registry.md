# Running the images where no container registry is reachable

Story 1.0's environment refuses every container registry (Docker Hub, GHCR, ECR
Public) by egress policy, so `docker pull node:22-alpine` fails and buildkit cannot
resolve a base image. Both images were nevertheless **built and run** there, and
this is how - the same recipe works in any air-gapped or mirrored environment.

## The mechanism: base images are build ARGs

Both Dockerfiles declare their bases as build arguments whose defaults are the real
images. A normal `docker build .` is unchanged; a constrained build substitutes:

```bash
docker build --build-arg NODE_IMAGE=my-mirror/node:22-alpine .
docker build --build-arg NODE_IMAGE=... --build-arg NGINX_IMAGE=... ./clients/console
```

There is also **no `# syntax=` directive** in either Dockerfile, deliberately:
pinning the Dockerfile frontend makes every build depend on pulling
`docker/dockerfile` from Docker Hub, and neither file uses frontend-specific syntax.

## What was substituted, and what that does and does not prove

For Story 1.0's verification the bases were built locally from the host filesystem
(`docker import` of a curated rootfs carrying node 22 and nginx). So:

**Proven by actually running:** both Dockerfiles build end to end; `npm ci`, `tsc`
and `vite build` run inside the image build; the directional lint runs inside the
console image build; both containers start, report healthy to Docker's own
HEALTHCHECK, and run as non-root (`node` uid 1000, `nginx` uid 101); the API serves
on the published port with a read-only root filesystem; a command goes through the
API into Postgres and comes back out of the projection; cross-tenant isolation holds
against the container; the console serves its app shell, its SPA fallback, immutable
asset caching, `/healthz`, and a `/config.json` written from environment at start;
and the API drains on SIGTERM rather than being killed.

**Not proven:** anything specific to the real base images - Alpine's musl instead of
glibc, the official images' own users and entrypoints, and their digests. Two
substitute-base defects surfaced during this work and were fixed in the substitute,
not in the delivered Dockerfiles: a missing `librt.so.1` (native addons could not
load) and `/tmp` permissions (nginx could not create its temp paths). Neither
applies to `node:22-alpine` or `nginx:1.27-alpine`.

CI's `container-images` job builds both images on the real bases and runs
`scripts/compose-smoke.sh`. That is what closes the gap.

## One real bug this found

The API container crash-looped on first start with `MODULE_NOT_FOUND`. Story 1.0 had
used `@core/*`-style tsconfig `paths`, which are **compile-time only** - `tsc` does
not rewrite them - so `node dist/edge/src/main.js` had never worked, while all 29
tests passed because vitest resolved the aliases itself. **The built artifact had
never been executed.** Fixed by using relative imports, and `npm run
gate:built-artifact` now runs `dist` and asserts it serves and drains, so the class
of bug cannot return without CI or Docker.

## What the first real-base build on a developer machine found

Tanim ran `docker compose up -d --wait` on an M4 Pro Mac, 2026-09-03. **Both images
built cleanly on the real `node:22-alpine` and `nginx:1.27-alpine`** - `npm ci`, the
directional lint, `tsc -b` and `vite build` all succeeded on musl, which was the
risk flagged above. The rolldown musl binding resolved from the lockfile as hoped.

One failure, and it was a compose defect rather than an image one:

```
target migrate: failed to solve: image "docker.io/jazzticketing/api:dev": already exists
```

`api` and `migrate` both declared `build:` **and** the same `image:` tag, so bake
built both targets in parallel and they raced to export the same tag. Fixed: `api`
builds, `migrate` references with `pull_policy: never`. `gate:containers` now fails
that arrangement, with a negative control.

**Why nothing caught it earlier:** the race only fires when the tag is not already
in the local image store. Every run in this sandbox built `api` first and by hand,
so the tag always existed. A clean machine was the only thing that could surface it -
which is the same lesson as the path aliases and, before that, the drift gate.
