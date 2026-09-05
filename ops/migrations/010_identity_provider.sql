-- 010: a Tenant's identity provider, and the machinery that makes deprovisioning
-- bite (Story 1.5, FR-3, FR-83).
--
-- PER TENANT AND NEVER GLOBAL. FR-3 says so, and the key enforces it: `tenant_id` is
-- the primary key, so there is no such thing as a connection that is not one Tenant's.
-- A provider connected for Tenant A cannot authenticate a Tenant B user because there
-- is no row it could be read from.

-- ---------------------------------------------------------------- the routing hint
-- `GET /auth/sso/start?tenantSlug=` has to identify a Tenant BEFORE any credential
-- exists - a provider cannot be chosen without knowing whose it is. The slug is a
-- ROUTING HINT and not a credential: it confers nothing, and the start endpoint answers
-- identically for an unknown Tenant, a Tenant with no connection and an inactive one,
-- so it cannot be used to discover which Tenants exist or which use SSO.
ALTER TABLE control_plane.tenants ADD COLUMN slug text;

-- Backfilled from the name, with the Tenant's own id disambiguating a collision. A
-- loop rather than one statement because a second Tenant called "Seaside Group" must
-- get a different slug, and `UPDATE ... SET slug = f(name)` would simply fail.
DO $$
DECLARE t record; candidate text;
BEGIN
  FOR t IN SELECT id, name FROM control_plane.tenants ORDER BY created_at LOOP
    candidate := trim(both '-' from lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g')));
    IF candidate = '' THEN candidate := 'tenant'; END IF;
    candidate := left(candidate, 56);
    IF EXISTS (SELECT 1 FROM control_plane.tenants WHERE slug = candidate) THEN
      candidate := candidate || '-' || lower(right(t.id, 6));
    END IF;
    UPDATE control_plane.tenants SET slug = candidate WHERE id = t.id;
  END LOOP;
END $$;

ALTER TABLE control_plane.tenants ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX tenants_slug ON control_plane.tenants (slug);

-- ------------------------------------------------------------------- the connection
CREATE TABLE control_plane.identity_connections (
  tenant_id     text PRIMARY KEY REFERENCES control_plane.tenants(id),
  protocol      text NOT NULL CHECK (protocol IN ('oidc', 'saml')),
  issuer        text NOT NULL,
  client_id     text NOT NULL,
  -- A NAME IN THE PLATFORM SECRET STORE, never the secret. The standing convention is
  -- "secrets from the platform secret store, never on a device", and the sharpest way
  -- to honour it is that the secret never enters this system at all: the API refuses to
  -- accept one, this column cannot hold one, and the value is resolved at the moment it
  -- is used. A value that never arrives cannot leak.
  client_secret_ref text NOT NULL,
  -- FR-83, and the default is the whole point. There is no configuration in which
  -- just-in-time provisioning defaults on: authentication is not authorisation, and an
  -- identity that authenticates but matches no provisioned Staff Member gets nothing.
  jit_provisioning boolean NOT NULL DEFAULT false,
  active        boolean NOT NULL DEFAULT true,
  created_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- The mapping from an authenticated identity to an EXISTING Staff Member. Story 1.3
-- creates the Staff Member; this only says which upstream identity is them.
-- (issuer, subject) rather than email: an address can be reassigned to a new employee,
-- a subject claim is stable for the life of the account, and matching on the address
-- alone is how a leaver's replacement inherits their access.
ALTER TABLE control_plane.staff_members
  ADD COLUMN external_issuer text,
  ADD COLUMN external_subject text;
CREATE UNIQUE INDEX staff_members_external_identity
  ON control_plane.staff_members (tenant_id, external_issuer, external_subject)
  WHERE external_subject IS NOT NULL;

-- ------------------------------------------------------------- the authorisation leg
-- One row per sign-in attempt, single-use and short-lived.
--
-- THE STATE'S HASH IS THE KEY, not the state. A row an attacker can read must not
-- contain a usable value - the same rule as invitations and password resets. The PKCE
-- verifier lives here because it must never travel to the browser: that is what stops
-- an intercepted authorisation code being exchanged by anyone but us.
CREATE TABLE control_plane.sso_states (
  state_hash    bytea PRIMARY KEY,
  tenant_id     text NOT NULL REFERENCES control_plane.tenants(id),
  code_verifier text NOT NULL,
  nonce         text NOT NULL,
  -- A PATH within this console, validated against an allowlist server-side before it
  -- is stored. An absolute URL is refused: an open redirect on a sign-in route is how a
  -- credential ends up somewhere it was not meant to go.
  return_to     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz
);
CREATE INDEX sso_states_expiry ON control_plane.sso_states (expires_at);

-- What a session authenticated AGAINST, and the upstream credential that lets us ask
-- the provider whether it still stands.
--
-- AC-2 is "access is lost at next token validation, without a manual step in
-- JazzTicketing". The mechanism is an upstream refresh grant performed during OUR
-- refresh: when the provider refuses it, the identity is gone. That requires holding
-- the provider's refresh token, which is a real credential - so it is stored ENCRYPTED
-- (AES-256-GCM, key from the platform secret store) rather than hashed, because unlike
-- every other token in this schema we have to present it rather than compare it.
CREATE TABLE control_plane.sso_sessions (
  session_id    text PRIMARY KEY REFERENCES control_plane.sessions(id),
  tenant_id     text NOT NULL REFERENCES control_plane.tenants(id),
  issuer        text NOT NULL,
  subject       text NOT NULL,
  upstream_refresh       bytea,
  upstream_refresh_nonce bytea,
  last_checked_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ refresh rotation
-- SINGLE-USE, WITH CHAIN INVALIDATION. Presenting a refresh token twice means it is no
-- longer in only one place, so the whole chain dies rather than just the replayed link:
-- the alternative leaves whoever stole it holding a working credential.
CREATE TABLE control_plane.refresh_tokens (
  id              text PRIMARY KEY,
  chain_id        text NOT NULL,
  session_id      text NOT NULL REFERENCES control_plane.sessions(id),
  tenant_id       text NOT NULL REFERENCES control_plane.tenants(id),
  staff_member_id text NOT NULL REFERENCES control_plane.staff_members(id),
  token_hash      bytea NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  replaced_by     text
);
CREATE UNIQUE INDEX refresh_tokens_hash ON control_plane.refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_chain ON control_plane.refresh_tokens (chain_id);

-- ------------------------------------------------- the shipped baseline gains a permission
-- Story 1.4 made shipped roles immutable for EVERY connection, with no owner exemption
-- and a stated reason: "changing the shipped baseline means writing a migration, which
-- is what it should mean." This is the first time that has been needed, and it is what
-- the sentence was describing - drop the guard, make the change where somebody reviews
-- it, put the guard back. An escape hatch left in the trigger would have been called
-- from a handler eventually; this cannot be.
DROP TRIGGER roles_shipped_immutable ON control_plane.roles;

UPDATE control_plane.roles
   SET permissions = ARRAY[
         'property.read', 'property.create', 'property.deactivate', 'property.setup.read',
         'staff.read', 'staff.invite', 'role.read', 'role.define', 'identity.manage'
       ]
 WHERE is_shipped AND key = 'property_administrator';

CREATE TRIGGER roles_shipped_immutable
  BEFORE UPDATE OR DELETE ON control_plane.roles
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_shipped_role_change();

-- ------------------------------------------------------------------- AD-3 exceptions
-- A connection belongs to a TENANT and names no Property. The same named-list
-- exception Stories 1.1, 1.3 and 1.4 took, extended on purpose rather than by making
-- the column nullable and forgetting why.
ALTER TABLE control_plane.events DROP CONSTRAINT control_plane_events_property_exception;
ALTER TABLE control_plane.events
  ADD CONSTRAINT control_plane_events_property_exception CHECK (
    property_id IS NOT NULL
    OR type IN ('TenantProvisioned', 'TenantDeactivated', 'SupportAccessRequested',
                'SupportAccessExpired', 'FirstAdministratorInvited',
                'StaffMemberInvited', 'RolesAssigned', 'CredentialSet',
                'RoleDuplicated', 'RoleChanged',
                'IdentityProviderConnected', 'IdentityProviderDisconnected',
                'IdentityLinked')
  );

-- ------------------------------------------------------------------------ privileges
GRANT SELECT, INSERT, UPDATE ON control_plane.identity_connections TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.sso_states TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.sso_sessions TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.refresh_tokens TO jt_app;
-- Still no DELETE anywhere. Expired states and spent refresh tokens are swept by a
-- later story with a retention decision behind it, not deleted by a request handler.
REVOKE DELETE ON control_plane.identity_connections FROM jt_app;
REVOKE DELETE ON control_plane.sso_states FROM jt_app;
REVOKE DELETE ON control_plane.sso_sessions FROM jt_app;
REVOKE DELETE ON control_plane.refresh_tokens FROM jt_app;

-- And Jazzware cannot read any of it. A customer's identity connection names their
-- corporate provider and their people's subject claims: customer data under FR-1, and
-- Story 11.3's time-boxed, customer-visible support grant is the only route in.
REVOKE ALL ON control_plane.identity_connections FROM jt_control;
REVOKE ALL ON control_plane.sso_states FROM jt_control;
REVOKE ALL ON control_plane.sso_sessions FROM jt_control;
REVOKE ALL ON control_plane.refresh_tokens FROM jt_control;
