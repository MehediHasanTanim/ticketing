-- Stories 11.1 and 1.1. The Jazzware-internal surface, and provisioning.
--
-- THE SEPARATION IS ENFORCED BY DATABASE PRIVILEGES, NOT BY APPLICATION CODE.
-- FR-1 promises that "provisioning grants Jazzware no standing access to tenant
-- data" and Story 11.1 AC-1 requires an operator session to grant NO read of any
-- Tenant's operational data. A permission check in a handler is a promise someone
-- can widen; a role with no grants on `cell.*` cannot read a Job if the code asks
-- it to. So the control-plane surface connects as `jt_control`, which is granted
-- nothing in the cell schema at all, and the cell continues to connect as `jt_app`,
-- which is granted nothing on the operator tables.
--
-- Applied from source by ops/migrate.ts. Never edited after being applied; add a
-- new numbered file instead.

-- ------------------------------------------------------------ control-plane events
-- AD-1 is about the Job core; this is the control plane's own append-only log, and
-- it exists because Story 1.1 T1 asks for ONE `TenantProvisioned` event carrying the
-- seeded role set rather than seven separate writes.
--
-- `property_id` IS NULLABLE HERE, AND ONLY HERE. Story 1.1's implementation notes
-- name this as "the single permitted exception" to AD-3 and require it to be
-- "explicit in the schema, not incidental" - hence a column comment and a CHECK that
-- says out loud which event types may omit it.
CREATE TABLE control_plane.events (
  seq          bigserial PRIMARY KEY,
  event_id     text NOT NULL UNIQUE,
  type         text NOT NULL,
  tenant_id    text NOT NULL,
  property_id  text,
  operator_id  text,
  occurred_at  timestamptz NOT NULL,
  recorded_at  timestamptz NOT NULL,
  payload      jsonb NOT NULL,
  CONSTRAINT control_plane_events_property_exception CHECK (
    property_id IS NOT NULL
    OR type IN ('TenantProvisioned', 'TenantDeactivated', 'SupportAccessRequested',
                'SupportAccessExpired', 'FirstAdministratorInvited')
  )
);
COMMENT ON COLUMN control_plane.events.property_id IS
  'NULL only for Tenant-scoped control-plane facts (Story 1.1: the single permitted exception to AD-3). The CHECK constraint names them.';
CREATE INDEX control_plane_events_tenant_seq ON control_plane.events (tenant_id, seq);

-- ------------------------------------------------------------- operator identity
-- FR-86. Jazzware's own people. No Tenant scope, because an operator is not scoped
-- to a customer - that absence is the point (AD-4).
CREATE TABLE control_plane.operator_accounts (
  id                text PRIMARY KEY,
  -- Allowlisted in tests/control-plane.test.ts: an OPERATOR's own work address is
  -- staff identity, not guest data (DG-1 governs guests; DG-5 governs staff, and
  -- forbids payroll identifiers and dates of birth, neither of which appear here).
  email             text NOT NULL UNIQUE,
  display_name      text NOT NULL,
  scopes            text[] NOT NULL,
  credential_hash   bytea NOT NULL,
  credential_salt   bytea NOT NULL,
  -- Story 11.2 AC-2: the bootstrap account's credential must be changed on first
  -- use. Story 11.1 records the flag; 11.2 builds the change endpoint.
  must_change_credential boolean NOT NULL DEFAULT false,
  -- Deactivate, never delete: an audit trail referencing a deleted actor has holes
  -- in it (Story 11.2 AC-3, 11.3).
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text REFERENCES control_plane.operator_accounts(id)
);

-- One row per sign-in, so sign-out can end THIS session (contract: /operator/sign-out)
-- rather than every session the operator holds. Deactivation is handled by the
-- `active` check above, which is why 11.1 AC-4's "at next validation" needs no sweep.
CREATE TABLE control_plane.operator_sessions (
  id           text PRIMARY KEY,
  operator_id  text NOT NULL REFERENCES control_plane.operator_accounts(id),
  issued_at    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX operator_sessions_operator ON control_plane.operator_sessions (operator_id);

-- ----------------------------------------------------------------- audit trails
-- Two of them, deliberately (Story 11.3). Internal activity does not belong inside
-- a customer's records, and a support grant must appear in BOTH.
CREATE TABLE control_plane.operator_audit (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  operator_id  text NOT NULL,
  action       text NOT NULL,
  tenant_id    text,
  details      jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX operator_audit_occurred ON control_plane.operator_audit (occurred_at DESC);

-- The Tenant's own. FR-6 is owned by E1 and its read/export surface is Story 1.11;
-- the writing has to start with the first Tenant-scoped fact, which is this story.
CREATE TABLE control_plane.tenant_audit (
  id           bigserial PRIMARY KEY,
  tenant_id    text NOT NULL REFERENCES control_plane.tenants(id),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  actor        text NOT NULL,
  actor_kind   text NOT NULL CHECK (actor_kind IN ('jazzware_operator', 'staff_member', 'system')),
  action       text NOT NULL,
  details      jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX tenant_audit_tenant_occurred ON control_plane.tenant_audit (tenant_id, occurred_at DESC);

-- ------------------------------------------------------------------ provisioning
ALTER TABLE control_plane.tenants
  ADD COLUMN active boolean NOT NULL DEFAULT true;

-- FR-2's shipped role set, seeded per Tenant at provisioning. Story 1.3 assigns
-- them; Story 1.4 adds custom ones. `is_shipped` is what stops 1.4 from letting
-- someone delete the floor under 1.3.
CREATE TABLE control_plane.roles (
  tenant_id   text NOT NULL REFERENCES control_plane.tenants(id),
  key         text NOT NULL,
  name        text NOT NULL,
  is_shipped  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

-- Platform defaults, seeded at provisioning (Story 1.1 T1). Deliberately `jsonb`
-- and NOT a column per setting: Story 1.6 owns Tenant defaults and FR-83 owns their
-- blast-radius display, so giving this structure here would be designing 1.6's model
-- from inside 1.1 and then migrating it.
CREATE TABLE control_plane.tenant_settings (
  tenant_id   text PRIMARY KEY REFERENCES control_plane.tenants(id),
  defaults    jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- The first administrator's invitation. THE PLAINTEXT TOKEN IS NOT STORED - only a
-- hash - so a database read cannot be turned into a sign-in.
CREATE TABLE control_plane.invitations (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL REFERENCES control_plane.tenants(id),
  -- Allowlisted in tests/control-plane.test.ts for the same reason as
  -- operator_accounts.email: this is a hotel ADMINISTRATOR's work address (staff
  -- identity, DG-5), never a guest's.
  email       text NOT NULL,
  scope       text NOT NULL CHECK (scope IN ('tenant_administrator')),
  token_hash  bytea NOT NULL,
  expires_at  timestamptz NOT NULL,
  redeemed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_tenant ON control_plane.invitations (tenant_id);

-- Outbox for anything that has to leave the system. It exists in this story for one
-- reason: THE OPERATOR MUST NOT SEE THE INVITATION TOKEN. Returning it in the
-- provisioning response would hand Jazzware a way into the customer's first
-- administrator account, which is precisely what FR-1's "no standing access"
-- forbids. So provisioning inserts the token here and the operator role is granted
-- INSERT and nothing else - it cannot read back what it wrote. The notification
-- adapter (AD-8) drains this; until that exists, delivery is unimplemented and says
-- so rather than leaking.
CREATE TABLE control_plane.outbox (
  id           text PRIMARY KEY,
  kind         text NOT NULL,
  tenant_id    text,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

-- Story 1.1 AC-3 / T3. Requested, time-boxed, and visible to the customer.
CREATE TABLE control_plane.support_grants (
  id                text PRIMARY KEY,
  tenant_id         text NOT NULL REFERENCES control_plane.tenants(id),
  operator_id       text NOT NULL REFERENCES control_plane.operator_accounts(id),
  reason            text NOT NULL,
  requested_minutes integer NOT NULL CHECK (requested_minutes BETWEEN 1 AND 1440),
  status            text NOT NULL CHECK (status IN ('requested', 'approved', 'expired', 'revoked')),
  requested_at      timestamptz NOT NULL DEFAULT now(),
  approved_at       timestamptz,
  -- Time-boxing is not optional (FR-1). A grant with no expiry cannot be approved.
  expires_at        timestamptz,
  CONSTRAINT approved_grants_expire CHECK (status <> 'approved' OR expires_at IS NOT NULL)
);
CREATE INDEX support_grants_tenant ON control_plane.support_grants (tenant_id, requested_at DESC);

-- --------------------------------------------------- deactivate, never delete
-- Story 1.1 AC-4. Revoking DELETE would be enough for the application role, but a
-- trigger states the rule where anyone reading the schema will find it, and covers
-- an admin connection too.
CREATE OR REPLACE FUNCTION control_plane.refuse_tenant_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'a Tenant is deactivated, never deleted (FR-1, Story 1.1 AC-4): set active = false'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_no_delete
  BEFORE DELETE ON control_plane.tenants
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_tenant_delete();

-- ------------------------------------------------------------------- privileges
-- The control-plane role. Granted NOTHING in the cell schema, so an operator
-- session cannot read a Job, an event or a projection even if a future handler asks
-- it to. This is Story 11.1 AC-1 as a database fact rather than a code review.
CREATE ROLE jt_control LOGIN PASSWORD 'jt_control_local_only' NOSUPERUSER NOBYPASSRLS;

GRANT USAGE ON SCHEMA control_plane TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.tenants TO jt_control;
GRANT SELECT, INSERT ON control_plane.events TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.operator_accounts TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.operator_sessions TO jt_control;
GRANT SELECT, INSERT ON control_plane.operator_audit TO jt_control;
GRANT SELECT, INSERT ON control_plane.tenant_audit TO jt_control;
GRANT SELECT, INSERT ON control_plane.roles TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.tenant_settings TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.invitations TO jt_control;
GRANT SELECT, INSERT, UPDATE ON control_plane.support_grants TO jt_control;
GRANT SELECT ON control_plane.properties TO jt_control;
GRANT USAGE, SELECT ON SEQUENCE control_plane.events_seq_seq TO jt_control;
GRANT USAGE, SELECT ON SEQUENCE control_plane.operator_audit_id_seq TO jt_control;
GRANT USAGE, SELECT ON SEQUENCE control_plane.tenant_audit_id_seq TO jt_control;

-- INSERT AND NOTHING ELSE. The operator surface writes the invitation token here
-- and cannot read it back.
GRANT INSERT ON control_plane.outbox TO jt_control;

-- Both audit trails are append-only at the storage layer, like cell.events.
REVOKE UPDATE, DELETE, TRUNCATE ON control_plane.operator_audit FROM jt_control;
REVOKE UPDATE, DELETE, TRUNCATE ON control_plane.tenant_audit FROM jt_control;
REVOKE UPDATE, DELETE, TRUNCATE ON control_plane.events FROM jt_control;
-- And a Tenant cannot be deleted by the role that provisions them.
REVOKE DELETE ON control_plane.tenants FROM jt_control;

-- The CELL role gets nothing on any of this. It already holds SELECT on
-- control_plane.tenants and .properties from migration 002 - the directory it needs
-- - and must not see operator identity, invitations, grants or either audit trail.
REVOKE ALL ON control_plane.operator_accounts FROM jt_app;
REVOKE ALL ON control_plane.operator_sessions FROM jt_app;
REVOKE ALL ON control_plane.operator_audit FROM jt_app;
REVOKE ALL ON control_plane.invitations FROM jt_app;
REVOKE ALL ON control_plane.outbox FROM jt_app;
REVOKE ALL ON control_plane.support_grants FROM jt_app;
-- Story 1.3 will need to read a Tenant's roles; it gets SELECT and nothing more.
GRANT SELECT ON control_plane.roles TO jt_app;
GRANT SELECT ON control_plane.tenant_settings TO jt_app;
-- 1.11 builds the Tenant audit read surface; the cell may append to it meanwhile.
GRANT SELECT, INSERT ON control_plane.tenant_audit TO jt_app;
REVOKE UPDATE, DELETE, TRUNCATE ON control_plane.tenant_audit FROM jt_app;
GRANT USAGE, SELECT ON SEQUENCE control_plane.tenant_audit_id_seq TO jt_app;
