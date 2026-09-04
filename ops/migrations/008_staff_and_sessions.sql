-- 008: Staff Members, roles per Property, credentials and sessions (Story 1.3).
--
-- WHY THE CONTROL PLANE AND NOT THE CELL. A Staff Member's roles decide what they
-- may do at a Property, and the answer has to be available before any cell row is
-- read - the permission decision is what admits a request to the cell in the first
-- place. It also has to span Properties: AC-3 has one person holding roles at two
-- Properties and switching between them, and AC-5 has a corporate-scoped person
-- reading across the Tenant. That is directory shape, which is where `properties`,
-- `roles` and `tenant_settings` already live (AD-4). None of it is guest data, so
-- AD-4's "the control plane holds no guest data" is untouched, and DG-5 is honoured
-- by what these tables DO NOT have: no payroll identifier and no date of birth.
--
-- WHAT JAZZWARE CANNOT SEE. `jt_control` is granted NOTHING here. FR-1 gives
-- Jazzware no standing access to a customer's data, and a customer's staff list -
-- names, work addresses, who holds authority where - is exactly that. Story 11.3's
-- support grant is the only route, and it is time-boxed and visible to the customer.
-- The REVOKEs at the bottom make that a database fact rather than a convention.

-- A Property is addressed together with its Tenant everywhere below, so that a
-- (tenant_id, property_id) pair naming another Tenant's Property cannot be stored at
-- all. The crafted payload in AC-4 is refused in the handler; this is the second
-- refusal, for the handler that forgets.
CREATE UNIQUE INDEX properties_tenant_id ON control_plane.properties (tenant_id, id);

CREATE TABLE control_plane.staff_members (
  id            text PRIMARY KEY,
  tenant_id     text NOT NULL REFERENCES control_plane.tenants(id),
  name          text NOT NULL,
  -- Nullable, and the null is the DECISION: no email means a PIN-only account for a
  -- Shared Device (AC-1). Staff identity under DG-5, never a guest address.
  email         text,
  -- FR-61: applied at sign-in and reverted for the next person on a Shared Device,
  -- so it is session state derived from a Staff Member attribute - stored here
  -- because this is where the person is described, consumed by the handset in 4.6.
  language_tag  text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  -- The Staff Member or Jazzware operator who issued the invitation. Text, not a
  -- foreign key: the first administrator of a Tenant is invited by an operator whose
  -- account lives in a table this row must not be able to join to.
  invited_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
  -- DG-5: no payroll identifier and no date of birth, here or in any column a later
  -- migration adds. There is no CHECK that can enforce the absence of a column, and
  -- a CHECK (true) pretending to would be worse than the comment - the enforcement
  -- that exists is `additionalProperties: false` on the request schema, so neither
  -- arrives from a caller in the first place.
);
CREATE UNIQUE INDEX staff_members_tenant_email
  ON control_plane.staff_members (tenant_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX staff_members_tenant ON control_plane.staff_members (tenant_id, created_at);

-- (Property, role) PAIRS - the unit AC-1 asks for. One row per pair, so one Staff
-- Member holds different roles at different Properties in one Tenant and the answer
-- to "what may they do here" is a query rather than an interpretation.
--
-- property_id IS NULLABLE, and NULL means the whole Tenant. Two roles need it: a
-- corporate viewer's authority IS the Tenant (AC-5), and a Tenant's FIRST
-- administrator is created before any Property exists (FR-1), so a Property-scoped
-- grant could not describe them. WHICH roles may be held Tenant-wide is a domain
-- rule in core/src/staff/roles.ts, not a column here - a line staff role granted
-- Tenant-wide would be a privilege grant nobody asked for, and the aggregate refuses
-- it where it can be unit-tested.
CREATE TABLE control_plane.staff_roles (
  tenant_id       text NOT NULL,
  staff_member_id text NOT NULL REFERENCES control_plane.staff_members(id),
  property_id     text,
  role_key        text NOT NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  granted_by      text NOT NULL,
  FOREIGN KEY (tenant_id, role_key) REFERENCES control_plane.roles(tenant_id, key),
  -- The composite reference is the point: a Property id that belongs to another
  -- Tenant does not satisfy it.
  FOREIGN KEY (tenant_id, property_id) REFERENCES control_plane.properties(tenant_id, id)
);
-- COALESCE, because a NULL property_id must still collide with itself: two identical
-- Tenant-wide grants are one grant, and a unique constraint over a nullable column
-- would happily store both.
CREATE UNIQUE INDEX staff_roles_unique
  ON control_plane.staff_roles (tenant_id, staff_member_id, COALESCE(property_id, ''), role_key);
CREATE INDEX staff_roles_member ON control_plane.staff_roles (staff_member_id);
CREATE INDEX staff_roles_property ON control_plane.staff_roles (tenant_id, property_id);

-- Credentials, hashed with scrypt in adapters/src/crypto/credential.ts. One row per
-- (Staff Member, kind): a person may hold a password and a PIN, and the CAPABILITY
-- DIFFERENCE between them is not stored here at all - it is derived from the kind in
-- core/src/staff/roles.ts (FR-4). Storing "what this credential may do" beside the
-- credential is how the two get out of step.
CREATE TABLE control_plane.staff_credentials (
  staff_member_id text NOT NULL REFERENCES control_plane.staff_members(id),
  kind            text NOT NULL CHECK (kind IN ('password', 'pin')),
  hash            bytea NOT NULL,
  salt            bytea NOT NULL,
  set_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_member_id, kind)
);

-- A session is a SIGN-IN, and deliberately carries NO PROPERTY. A context switch
-- mints a new token (AD-3) and the token carries the scope; permissions are
-- re-resolved from staff_roles for the token's Property on every request. Recording
-- a current Property here as well would be a second source of truth for a question
-- that must have exactly one answer (AC-3, AD-11).
CREATE TABLE control_plane.sessions (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES control_plane.tenants(id),
  staff_member_id text NOT NULL REFERENCES control_plane.staff_members(id),
  credential_type text NOT NULL CHECK (credential_type IN ('sso', 'password', 'pin', 'badge')),
  language_tag    text NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  -- Set by a password reset, which must end the sessions the old credential could
  -- have opened, and by remote sign-out in Story 4.8 (FR-64).
  revoked_at      timestamptz,
  revoked_reason  text
);
CREATE INDEX sessions_member ON control_plane.sessions (staff_member_id) WHERE revoked_at IS NULL;

CREATE TABLE control_plane.password_resets (
  id              text PRIMARY KEY,
  tenant_id       text NOT NULL REFERENCES control_plane.tenants(id),
  staff_member_id text NOT NULL REFERENCES control_plane.staff_members(id),
  -- Only the hash, exactly as with invitations: a row an attacker can read must not
  -- contain a usable credential.
  token_hash      bytea NOT NULL,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_member ON control_plane.password_resets (staff_member_id, created_at DESC);

-- Story 1.1 records the first administrator's invitation with scope
-- `tenant_administrator` and no Staff Member - none exists yet, because FR-1 has
-- provisioning create no Properties. Story 1.3 redeems it and creates the Staff
-- Member then, with a TENANT-WIDE property_administrator grant, which is why that
-- scope has to exist at all. A staff invitation from /staff already has its Staff
-- Member, so the column is nullable and the difference is visible in the row.
ALTER TABLE control_plane.invitations
  ADD COLUMN staff_member_id text REFERENCES control_plane.staff_members(id);
-- Dropped by lookup rather than by guessing the name Postgres generated for the
-- inline CHECK in migration 004: a name that turns out to be `invitations_scope_check1`
-- would fail the whole migration on a database nobody can inspect at the time.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'control_plane.invitations'::regclass
     AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%tenant_administrator%';
  IF c IS NULL THEN
    RAISE EXCEPTION 'expected migration 004''s scope CHECK on control_plane.invitations; found none';
  END IF;
  EXECUTE format('ALTER TABLE control_plane.invitations DROP CONSTRAINT %I', c);
END $$;
ALTER TABLE control_plane.invitations
  ADD CONSTRAINT invitations_scope_check CHECK (scope IN ('tenant_administrator', 'staff_member'));

-- Deactivated, never deleted - the same rule as Tenants and Properties, and for the
-- same reason: a Staff Member is referenced by every Job they ever touched, and a
-- deleted row turns that history into dangling ids.
CREATE OR REPLACE FUNCTION control_plane.refuse_staff_member_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'a Staff Member is deactivated, never deleted: their id is referenced by every Job they touched (Story 1.3)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_members_no_delete
  BEFORE DELETE ON control_plane.staff_members
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_staff_member_delete();

-- ------------------------------------------------------------------- privileges
-- The CELL role owns all of this: a Staff Member signs in at a cell, and every
-- request that cell serves resolves their permissions.
GRANT SELECT, INSERT, UPDATE ON control_plane.staff_members TO jt_app;
GRANT SELECT, INSERT ON control_plane.staff_roles TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.staff_credentials TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.sessions TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.password_resets TO jt_app;

-- NO DELETE, anywhere in this migration. On staff_roles that is not incidental
-- housekeeping: this story assigns roles and Story 1.4 builds the role editor, so a
-- revocation path that does not exist yet cannot be reached by accident from a
-- handler written for something else.
REVOKE DELETE ON control_plane.staff_members FROM jt_app;
REVOKE DELETE ON control_plane.staff_roles FROM jt_app;
REVOKE DELETE ON control_plane.staff_credentials FROM jt_app;
REVOKE DELETE ON control_plane.sessions FROM jt_app;
REVOKE DELETE ON control_plane.password_resets FROM jt_app;

-- Redeeming an invitation needs to read one, mark it redeemed, and - for a staff
-- invitation issued at /staff - write one. It does NOT need to read the table.
--
-- Migration 004 revoked everything on `invitations` from the cell role deliberately,
-- and `tests/provisioning.test.ts` asserts it: "gives the CELL role no sight of
-- operator identity, invitations or grants". Granting SELECT back would have been a
-- quiet reversal of a documented boundary - the cell serves every request in the
-- product, control-plane tables carry no row-level security, and the only thing left
-- standing between a future handler and every Tenant's invitation addresses would be
-- a WHERE clause somebody remembered to write. That is the failure mode this codebase
-- refuses elsewhere: "a rule stated only in a route is a rule the next route forgets."
--
-- So the cell gets three SECURITY DEFINER functions and no table privilege. Each one
-- is exactly as wide as the operation needs:
--
--   * a lookup BY TOKEN HASH, which cannot enumerate - you must already hold the
--     token, and it takes a row lock so two concurrent redemptions of one token
--     cannot both succeed. Single-use becomes a database property rather than a
--     timing accident;
--   * a redemption that refuses a second attempt by returning zero rows;
--   * an issue function whose scope is HARD-CODED to 'staff_member', so a cell can
--     never mint a `tenant_administrator` invitation however it is called. Only
--     Jazzware's own surface can do that, which is what FR-1 says.
CREATE FUNCTION control_plane.find_invitation_by_token(p_token_hash bytea, p_now timestamptz)
RETURNS TABLE (id text, tenant_id text, email text, scope text, staff_member_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = control_plane, pg_temp
AS $$
  SELECT i.id, i.tenant_id, i.email, i.scope, i.staff_member_id
    FROM control_plane.invitations i
   WHERE i.token_hash = p_token_hash
     AND i.redeemed_at IS NULL
     AND i.expires_at > p_now
   FOR UPDATE
$$;

CREATE FUNCTION control_plane.redeem_invitation(p_id text, p_staff_member_id text, p_now timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = control_plane, pg_temp
AS $$
DECLARE affected integer;
BEGIN
  UPDATE control_plane.invitations
     SET redeemed_at = p_now,
         -- Story 1.1's first-administrator invitation arrives with no Staff Member,
         -- because none exists until it is redeemed. A staff invitation already has
         -- one, and COALESCE means redemption never reassigns it.
         staff_member_id = COALESCE(staff_member_id, p_staff_member_id)
   WHERE id = p_id AND redeemed_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

CREATE FUNCTION control_plane.issue_staff_invitation(
  p_id text, p_tenant_id text, p_email text, p_token_hash bytea,
  p_expires_at timestamptz, p_now timestamptz, p_staff_member_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = control_plane, pg_temp
AS $$
BEGIN
  IF p_staff_member_id IS NULL THEN
    RAISE EXCEPTION 'a staff invitation must name the Staff Member it belongs to';
  END IF;
  INSERT INTO control_plane.invitations
    (id, tenant_id, email, scope, token_hash, expires_at, created_at, staff_member_id)
  VALUES
    (p_id, p_tenant_id, p_email, 'staff_member', p_token_hash, p_expires_at, p_now, p_staff_member_id);
END $$;

-- SECURITY DEFINER functions are EXECUTE-to-PUBLIC by default, which would hand them
-- to every role in the database including any added later.
REVOKE ALL ON FUNCTION control_plane.find_invitation_by_token(bytea, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION control_plane.redeem_invitation(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION control_plane.issue_staff_invitation(text, text, text, bytea, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION control_plane.find_invitation_by_token(bytea, timestamptz) TO jt_app;
GRANT EXECUTE ON FUNCTION control_plane.redeem_invitation(text, text, timestamptz) TO jt_app;
GRANT EXECUTE ON FUNCTION control_plane.issue_staff_invitation(text, text, text, bytea, timestamptz, timestamptz, text) TO jt_app;

-- INSERT AND NOTHING ELSE on the outbox, the same shape Story 1.1 gave jt_control:
-- the cell queues an invitation or reset link and cannot read back what it queued.
-- It generated the token in memory, so this is not secrecy from itself - it is that
-- no query, no report and no future handler can harvest a pending credential.
GRANT INSERT ON control_plane.outbox TO jt_app;
REVOKE SELECT, UPDATE, DELETE ON control_plane.outbox FROM jt_app;

-- And what JAZZWARE cannot reach. FR-1: no standing access to customer data, and a
-- customer's staff list is customer data. Story 11.3's time-boxed, customer-visible
-- support grant is the only route in.
REVOKE ALL ON control_plane.staff_members FROM jt_control;
REVOKE ALL ON control_plane.staff_roles FROM jt_control;
REVOKE ALL ON control_plane.staff_credentials FROM jt_control;
REVOKE ALL ON control_plane.sessions FROM jt_control;
REVOKE ALL ON control_plane.password_resets FROM jt_control;

-- ------------------------------------------------- AD-3's named exceptions, extended
-- A Staff Member belongs to a TENANT and holds roles at zero or more Properties, so
-- neither of this story's events can name one Property. That is the same exception
-- Story 1.1 took for Tenant-scoped facts, and migration 004 deliberately made the
-- exception a NAMED LIST rather than a nullable column - so extending it is an edit
-- somebody has to make on purpose, which is the whole point.
ALTER TABLE control_plane.events DROP CONSTRAINT control_plane_events_property_exception;
ALTER TABLE control_plane.events
  ADD CONSTRAINT control_plane_events_property_exception CHECK (
    property_id IS NOT NULL
    OR type IN ('TenantProvisioned', 'TenantDeactivated', 'SupportAccessRequested',
                'SupportAccessExpired', 'FirstAdministratorInvited',
                'StaffMemberInvited', 'RolesAssigned', 'CredentialSet')
  );
