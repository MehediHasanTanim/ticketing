-- Story 1.0 / AC-5. One region cell plus the guest-data-free control plane (AD-4).
-- Applied from source by ops/migrate.ts. Never edited after being applied; add a
-- new numbered file instead.

CREATE SCHEMA IF NOT EXISTS control_plane;
CREATE SCHEMA IF NOT EXISTS cell;

-- ---------------------------------------------------------------- control plane
-- AD-4: tenant identity, roles and the property directory live here, and this
-- schema holds NO GUEST DATA. tests/control-plane.test.ts fails the build if a
-- guest-identifying column ever appears here.
CREATE TABLE control_plane.tenants (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE control_plane.properties (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES control_plane.tenants(id),
  name        text NOT NULL,
  -- DG-4: region is chosen at creation and immutable thereafter (Story 1.2
  -- enforces the refusal; the column exists here from the start).
  region      text NOT NULL,
  timezone    text NOT NULL DEFAULT 'UTC',
  currency    text NOT NULL DEFAULT 'USD',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------- event store
-- AD-1: the event sequence is the source of state.
-- AD-3: every event carries tenant_id and property_id.
-- AD-2: occurred_at is the domain clock, recorded_at the system clock.
CREATE TABLE cell.events (
  seq             bigserial PRIMARY KEY,
  event_id        text NOT NULL UNIQUE,
  type            text NOT NULL,
  tenant_id       text NOT NULL,
  property_id     text NOT NULL,
  staff_member_id text,
  occurred_at     timestamptz NOT NULL,
  recorded_at     timestamptz NOT NULL,
  payload         jsonb NOT NULL
);
CREATE INDEX events_scope_seq ON cell.events (tenant_id, property_id, seq);
CREATE INDEX events_type ON cell.events (type);

-- AD-7: server-enforced idempotency on (tenant, property, staff member, client key).
-- Person-scoped, NOT device-scoped: handsets are shared and a device-scoped key
-- would collide across shifts. Retained 30 days (swept by a later story).
CREATE TABLE cell.idempotency (
  tenant_id       text NOT NULL,
  property_id     text NOT NULL,
  staff_member_id text NOT NULL,
  client_key      text NOT NULL,
  event_id        text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, property_id, staff_member_id, client_key)
);

-- ------------------------------------------------------------------- projections
-- Rebuildable from cell.events by `npm run rebuild-projections`. Nothing here is
-- a source of truth.
CREATE TABLE cell.fixture_notes (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL,
  property_id text NOT NULL,
  text        text NOT NULL,
  recorded_at timestamptz NOT NULL
);
CREATE INDEX fixture_notes_scope ON cell.fixture_notes (tenant_id, property_id);

-- cell.schema_migrations is created by ops/migrate.ts before any migration runs,
-- because the ledger cannot be one of the entries it records.
