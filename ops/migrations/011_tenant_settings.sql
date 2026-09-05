-- 011: Tenant defaults, their blast radius, and the governance settings (Story 1.6).
--
-- NO NEW TABLE, and that is the finding rather than an omission. Story 1.2 already
-- modelled inheritance BY REFERENCE - `property_settings.inherits_version` plus an
-- `overrides` map whose comment says "a key present here stops inheriting FOREVER - AC
-- of Story 1.6" - and the `effective_property_settings` view already resolves it. This
-- story's prerequisites note warned that if 1.2 had COPIED values at creation, 1.6
-- could not be built and 1.2 would have to be corrected first. It did not, so what is
-- left here is data and two permissions.

-- ------------------------------------------------------ the governance defaults
-- Backfilled into every Tenant that already exists, so nobody has a settings row that
-- silently lacks a governance key and reads as "unset" when it means "never asked".
--
-- guestDataRetentionDays: 365 by default within a platform maximum of 730 (DG-2). The
-- PRD states NEITHER number - "Tenant-configurable retention within a platform maximum",
-- with no figures - so these two are PROPOSED, not settled. They are the conventional
-- pair (a year by default, two years as the ceiling) and they are deliberately visible
-- here rather than buried, because a retention period is a commitment to a hotel's
-- guests and Jazzware should choose it on purpose. Raised in the story record; change
-- them with a migration if the answer is different.
-- NOTHING ENFORCES THIS YET: no purge exists until the story that owns erasure (DG-3),
-- so it is a stored commitment rather than a running one.
--
-- crossTenantGuestHistory: FALSE, and the default is the point (FR-45). It widens who
-- can see one guest's Glitches and Recoveries across a management company's Properties,
-- so it is off until somebody decides otherwise and is attributed when they do.
UPDATE control_plane.tenant_settings
   SET defaults = jsonb_build_object(
         'crossTenantGuestHistory', false,
         'guestDataRetentionDays', 365
       ) || defaults,
       version = version + 1,
       updated_at = now()
 WHERE NOT (defaults ? 'crossTenantGuestHistory' AND defaults ? 'guestDataRetentionDays');

-- Who last changed them. The audit trail carries the actor and the previous value
-- (FR-6); this is the cheap read for a settings screen that wants to say "last changed
-- by" without walking it.
ALTER TABLE control_plane.tenant_settings
  ADD COLUMN updated_by text;

COMMENT ON COLUMN control_plane.property_settings.overrides IS
  'Keys this Property has taken over. PRESENCE is what stops inheritance, never a value comparison: a Property that overrides a key to the same value the Tenant happens to hold has still declined it permanently, and a later Tenant change must not reach it (Story 1.6 AC-2).';

-- ------------------------------------------------ two permissions, and the trigger
-- The same drop-change-restore that Story 1.5 performed, and for the same stated
-- reason: Story 1.4 made shipped roles immutable for every connection with no owner
-- exemption, so changing the shipped baseline means writing a migration somebody
-- reviews. This is the second time, which is the design working rather than chafing.
--
-- TWO permissions and not one, because the two acts have different scopes. Managing
-- TENANT defaults needs Tenant-wide authority - a change there is a change for every
-- inheriting Property. Overriding a setting on ONE Property is a Property-level act,
-- and requiring Tenant-wide authority for it would mean a property administrator could
-- not take over a default for their own Property, which is what overrides are for.
DROP TRIGGER roles_shipped_immutable ON control_plane.roles;

UPDATE control_plane.roles
   SET permissions = ARRAY[
         'property.read', 'property.create', 'property.deactivate', 'property.setup.read',
         'staff.read', 'staff.invite', 'role.read', 'role.define', 'identity.manage',
         'settings.manage', 'property.settings.write'
       ]
 WHERE is_shipped AND key = 'property_administrator';

CREATE TRIGGER roles_shipped_immutable
  BEFORE UPDATE OR DELETE ON control_plane.roles
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_shipped_role_change();

-- ------------------------------------------------------------------- AD-3 exception
-- A Tenant default change names no Property BY DEFINITION - it is the change whose
-- blast radius is every Property that inherits it. A Property override does name one,
-- so `PropertySettingOverridden` needs no exception and deliberately does not get one.
ALTER TABLE control_plane.events DROP CONSTRAINT control_plane_events_property_exception;
ALTER TABLE control_plane.events
  ADD CONSTRAINT control_plane_events_property_exception CHECK (
    property_id IS NOT NULL
    OR type IN ('TenantProvisioned', 'TenantDeactivated', 'SupportAccessRequested',
                'SupportAccessExpired', 'FirstAdministratorInvited',
                'StaffMemberInvited', 'RolesAssigned', 'CredentialSet',
                'RoleDuplicated', 'RoleChanged',
                'IdentityProviderConnected', 'IdentityProviderDisconnected',
                'IdentityLinked',
                'TenantDefaultsChanged')
  );

-- ------------------------------------------------------------------------ privileges
GRANT UPDATE ON control_plane.tenant_settings TO jt_app;
GRANT INSERT, UPDATE ON control_plane.property_settings TO jt_app;
REVOKE DELETE ON control_plane.tenant_settings FROM jt_app;
REVOKE DELETE ON control_plane.property_settings FROM jt_app;

-- Jazzware seeds a Tenant's defaults at provisioning and has no further business with
-- them: what a customer configures is customer data (FR-1).
REVOKE UPDATE, DELETE ON control_plane.tenant_settings FROM jt_control;
REVOKE ALL ON control_plane.property_settings FROM jt_control;
