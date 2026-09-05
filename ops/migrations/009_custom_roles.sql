-- 009: custom roles, their permission sets, and the guards (Story 1.4).
--
-- WHAT MOVES HERE. Story 1.3 compiled role -> permissions into
-- `core/src/staff/roles.ts` and said out loud what would change it: "Story 1.4 brings
-- custom roles, whose permissions live in the database rather than here." This is that
-- move. A permission set is now a property of a role IN A TENANT, because FR-81 lets a
-- hotel duplicate a shipped role and edit the copy - and a copy nobody else's Tenant
-- can see cannot be a constant in a shared build.
--
-- WHY AN ARRAY AND NOT A JOIN TABLE. A role's permissions are ONE FACT, read and
-- written whole, and FR-6 requires the audit trail to record the PREVIOUS VALUE of a
-- change. With an array that is a reading; with rows it is a reconstruction from what
-- was inserted and deleted. It also means the cell needs no DELETE privilege anywhere
-- to edit a role, which keeps Story 1.3's "no DELETE on anything" intact - the reason
-- that mattered was that a revocation path nobody built cannot be reached by accident.
-- Permission keys are code-defined, not rows, so there is no foreign key to lose.
ALTER TABLE control_plane.roles
  ADD COLUMN permissions text[] NOT NULL DEFAULT '{}',
  -- Provenance, and a RECORD rather than a link: the copy is independent at creation
  -- and later changes to the source do not reach it (AC-1). Deliberately unlike
  -- property_settings, which inherits BY REFERENCE (AD-9) - the two behaviours are
  -- different on purpose and share no code.
  ADD COLUMN duplicated_from text,
  ADD COLUMN assignable_at_tenant_scope boolean NOT NULL DEFAULT false,
  -- FR-43, stored and not routed. Story 9.4 owns what it means and builds the approval
  -- workflow; this story's job is that the number has somewhere to live.
  ADD COLUMN recovery_approval_threshold integer,
  ADD COLUMN created_by text,
  ADD COLUMN updated_at timestamptz,
  ADD CONSTRAINT roles_threshold_non_negative
    CHECK (recovery_approval_threshold IS NULL OR recovery_approval_threshold >= 0);

-- A composite reference, so a role cannot claim to be a copy of another Tenant's role.
ALTER TABLE control_plane.roles
  ADD CONSTRAINT roles_duplicated_from_fkey
  FOREIGN KEY (tenant_id, duplicated_from) REFERENCES control_plane.roles(tenant_id, key);

-- ------------------------------------------------- the shipped baseline, backfilled
-- WRITTEN OUT RATHER THAN GENERATED, and that is the point: a change to what a
-- supervisor may do is a migration somebody reviews, not a constant somebody edits.
-- `core/src/staff/roles.ts` remains the authority for a NEWLY provisioned Tenant
-- (Story 1.1 writes these same sets), and `tests/unit/role.test.ts` asserts the two
-- agree - so drift between them fails a test rather than surprising a Tenant.
--
-- Done BEFORE the immutability trigger exists, because after it no one may touch a
-- shipped role at all, including this migration.
UPDATE control_plane.roles SET permissions = ARRAY['property.read']
 WHERE is_shipped AND key IN ('line_staff', 'supervisor', 'department_manager', 'front_office', 'duty_manager');
UPDATE control_plane.roles SET permissions = ARRAY[
  'property.read', 'property.create', 'property.deactivate', 'property.setup.read',
  'staff.read', 'staff.invite', 'role.read', 'role.define'
], assignable_at_tenant_scope = true
 WHERE is_shipped AND key = 'property_administrator';
UPDATE control_plane.roles SET permissions = ARRAY['property.read', 'staff.read'],
       assignable_at_tenant_scope = true
 WHERE is_shipped AND key = 'corporate_viewer';

-- ------------------------------------------------------------------ FR-81's guard
-- A SHIPPED ROLE IS DUPLICABLE AND NEVER EDITABLE, so the baseline Jazzware support
-- can reason about is the same in every Tenant. Refused in three places, exactly as
-- residency is (Story 1.2): the aggregate, the handler, and here - because a rule
-- stated only in a route is a rule the next route forgets.
--
-- No owner exemption, deliberately. A reseeding step that could edit a shipped role
-- would be an escape hatch, and an escape hatch is a thing somebody eventually calls
-- from a handler. Changing the shipped baseline means writing a migration, which is
-- what it should mean.
CREATE OR REPLACE FUNCTION control_plane.refuse_shipped_role_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'a role is never deleted: it is what staff_roles stores, and deleting one would orphan every assignment (Story 1.4)';
  END IF;
  IF OLD.is_shipped THEN
    RAISE EXCEPTION
      'a shipped role is duplicable, never editable: duplicate it and edit the copy (FR-81, Story 1.4)';
  END IF;
  IF NEW.key <> OLD.key THEN
    RAISE EXCEPTION
      'a role key is stable: staff_roles stores it, so renaming one would orphan every assignment (Story 1.4)';
  END IF;
  IF NEW.is_shipped THEN
    RAISE EXCEPTION
      'a custom role cannot become a shipped one: the shipped set is the baseline support reasons about (FR-81)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_shipped_immutable
  BEFORE UPDATE OR DELETE ON control_plane.roles
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_shipped_role_change();

-- ------------------------------------------------------------------- AD-3 exceptions
-- A role belongs to a TENANT and names no Property - it is assignable at any of them.
-- The same named-list exception Stories 1.1 and 1.3 took, extended on purpose.
ALTER TABLE control_plane.events DROP CONSTRAINT control_plane_events_property_exception;
ALTER TABLE control_plane.events
  ADD CONSTRAINT control_plane_events_property_exception CHECK (
    property_id IS NOT NULL
    OR type IN ('TenantProvisioned', 'TenantDeactivated', 'SupportAccessRequested',
                'SupportAccessExpired', 'FirstAdministratorInvited',
                'StaffMemberInvited', 'RolesAssigned', 'CredentialSet',
                'RoleDuplicated', 'RoleChanged')
  );

-- ------------------------------------------------------------------- privileges
-- The cell defines and edits roles on the customer's own authority (FR-81), so it
-- gains INSERT and UPDATE. Still NO DELETE: a role key is what `staff_roles` stores,
-- and there is no revocation story yet.
GRANT INSERT, UPDATE ON control_plane.roles TO jt_app;
REVOKE DELETE ON control_plane.roles FROM jt_app;

-- And Jazzware still cannot write one. Story 1.1 seeds the shipped set at
-- provisioning and that is the whole of the operator's business with roles; a
-- customer's own role definitions are customer data (FR-1).
REVOKE UPDATE, DELETE ON control_plane.roles FROM jt_control;
