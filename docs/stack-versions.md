# Stack versions - confirmed, diverged, and still unverified

Story 1.0 / AC-7. Every version in `ARCHITECTURE-SPINE.md#Stack` was tagged
`[ASSUMPTION]`, produced from training knowledge with web access blocked. This is
what checking them actually found.

Sources used: the **npm registry** (authoritative for npm packages, reachable), the
**running binaries** for Postgres and Redis. `pub.dev` and `storage.googleapis.com`
are both blocked in this environment, so every Dart-side version remains unverified.

## Confirmed and adopted

| Component | Spine proposed | Confirmed | Notes |
|---|---|---|---|
| Node.js | 22 LTS | **22.22.2** | matches |
| PostgreSQL | 16.x | **16.13** | matches; running the cell |
| Redis | 7.x | **7.0.15** | matches |
| `pg` | - | **8.23.0** | |
| vitest | - | **4.1.11** | |
| dependency-cruiser | - | **18.2.0** | boundary gate |
| openapi-typescript | - | **7.13.0** | codegen |

## Diverged from the spine - reported, not silently adopted

| Component | Spine proposed | Registry latest | What Story 1.0 pinned | Why |
|---|---|---|---|---|
| TypeScript | 5.x | **7.0.2** | **5.9.3** | TS 7 is a brand-new major whose release notes cannot be read here. Pinned the newest 5.x, which the whole toolchain supports. **Tanim's call whether to move to 7.** |
| NestJS | 10.x | **12.0.1** | *not adopted* | See `docs/decisions/0001-http-framework-deferred.md`. |
| React | 18 | **19.2.8** | **19.2.8** | Adopted. The console scaffold builds on it. |
| Vite | - | **8.2.2** | **8.2.2** | |
| TanStack Query | - | 5.102.8 | *not installed* | Nothing in Story 1.0 fetches; arrives with Story 3.10. |

## Container base images - written, never built

| Image | Tag used | Status |
|---|---|---|
| `node` | 22-alpine | **[UNVERIFIED]** not digest-pinned |
| `nginx` | 1.27-alpine | **[UNVERIFIED]** not digest-pinned |
| `postgres` | 16-alpine | **[UNVERIFIED]** not digest-pinned |
| `redis` | 7-alpine | **[UNVERIFIED]** not digest-pinned |

Every container registry - Docker Hub, GHCR, ECR Public - is refused by the egress
policy in the environment where the containerisation was written. `docker build`
cannot resolve even a base image, and `docker build --check` is unavailable for the
same reason. So the Dockerfiles have **never been built** and the images have never
run.

Two consequences, both open:

1. **Digest-pin these four tags before any real deployment.** A floating tag is a
   supply-chain hole, not a style preference, and the digests could not be retrieved
   here. `npm run gate:containers` enforces non-root, health-checked, no-baked-secrets
   and ordered startup statically on every commit, but it cannot pin a digest it
   cannot fetch.
2. **CI's `container-images` job is what will first build them** - it builds both
   images and runs `scripts/compose-smoke.sh` against the standing cell. Expect the
   first run to need fixes; nothing about these files has been executed.

## Still unverified - could not be checked here

| Component | Spine proposed | Blocker |
|---|---|---|
| Flutter | 3.2x | `storage.googleapis.com` returns 403 |
| Dart | 3.x | same |
| Drift (SQLite) | - | `pub.dev` unreachable |
| `firebase_messaging`, `workmanager` | - | `pub.dev` unreachable |
| Managed Kubernetes flavour, cloud provider, IaC | deferred by the spine | a deliberate deferral, not a gap - decide with whoever operates Jazz Core so both run under one on-call rota (OR-4) |

**Consequence:** the Dart half of AD-14's two-language gate has never executed. The
gate is written, wired into CI with `dart-lang/setup-dart`, and correctly fails when
Dart is absent - but until it runs somewhere with a Dart SDK, the claim "both
implementations agree" is unproven. It is the first thing to check on a machine or
runner with network access.
