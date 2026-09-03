# 0001 - The HTTP framework decision is deferred, deliberately

**Status:** open - needs Tanim
**Date:** 2026-09-02
**Raised by:** Story 1.0 implementation

## What the spine proposes

`ARCHITECTURE-SPINE.md#Stack` lists **NestJS 10.x** as the API framework, tagged
`[ASSUMPTION]` along with every other version in that table, because web access was
blocked throughout planning and the versions came from training knowledge.

## What is actually current

The npm registry says **NestJS 12.0.1**. The spine's assumption was two majors
behind. Release notes for 11 and 12 could not be read - the same web restriction is
still in force.

## What Story 1.0 did

`edge/src/server.ts` routes with `node:http` in about forty lines. No framework has
been adopted.

## Why

Story 1.0's acceptance criteria name no framework. Committing to an unread
brand-new major on the first day of the build would be exactly the silent
assumption AC-7 forbids - and the cost asymmetry is stark: swapping forty lines of
routing for a framework in Story 3.1 is an afternoon, while unpicking a wrong
framework choice after twenty stories are built on it is not.

## What is needed

1. Read the NestJS 11 and 12 release notes and confirm the version.
2. Decide NestJS 12, Fastify 5, or staying on `node:http`.
3. Update the spine's Stack table with the confirmed choice.

Until then the routing layer stays deliberately trivial and framework-free. Nothing
in `core/`, `app/` or `adapters/` depends on the answer, which is the point of the
hexagonal boundary.
