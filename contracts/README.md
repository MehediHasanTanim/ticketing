# contracts/ - the schema of record

Promoted from a convenience to load-bearing when the mobile client became Flutter
(ARCHITECTURE-SPINE.md#Revision log): server and handset no longer share types by
construction, so **this directory is the single source** and both language bindings
are generated from it.

- `openapi.yaml` - the HTTP surface
- `events/` - event schemas (past tense, domain-first, one per real-world fact)
- `errors/envelope.json` - the one error envelope: `code`, `message` key, `retryable`
- `sla-fixtures/vectors.json` - the SLA fold's behaviour, executed by **both** languages
- `conflict-rules/` - per-intent offline conflict rules (populated by Story 4.4)
- `locale/` - locale keys (AD-12)
- `generated/` - **generated, committed, and drift-checked.** Never hand-edit.

No wire type is hand-written on either side. `npm run gate:codegen-drift` fails the
build if a generated file differs from its committed copy, or if a wire type is
declared outside `generated/`.
