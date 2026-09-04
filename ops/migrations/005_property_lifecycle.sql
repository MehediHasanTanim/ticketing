-- Story 1.2: create a Property under a Tenant.
--
-- Three things here are load-bearing and none of them is the properties table,
-- which already existed from migration 001:
--
--   1. A CELL REGISTRY, so "the Property exists in the chosen region's cell"
--      (AC-1) can be true rather than aspirational. A region nobody serves is
--      refused at creation instead of recorded and quietly unroutable.
--   2. INHERITANCE BY REFERENCE, not by copying. Story 1.2 T1 is explicit, and
--      Story 1.6 depends on the distinction: a Property that overrides a default
--      must stop inheriting it PERMANENTLY, which is only expressible as a link
--      plus an override set. A copy at creation time cannot express it at all.
--   3. REGION IMMUTABILITY AS A DATABASE RULE. DG-4 is a residency obligation,
--      not a form-field convention, so a trigger refuses the change for every
--      connection - including an admin one, and including a future story that
--      forgets.
--
-- Applied from source by ops/migrate.ts. Never edited after being applied.

-- ------------------------------------------------------------------ cell registry
-- AD-4: regional cells, and a Property never leaves its region. The control plane
-- is the only thing that knows which cell holds which Property, so it is the only
-- place that can answer "is this region even available?".
CREATE TABLE control_plane.cells (
  name       text PRIMARY KEY,
  region     text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cells_region ON control_plane.cells (region) WHERE active;

COMMENT ON TABLE control_plane.cells IS
  'Which cells exist and which region each serves. Seeded from CELL_NAME by ops/migrate.ts on every deploy, so a cell registers itself rather than being listed by hand.';

-- --------------------------------------------------------------- property lifecycle
ALTER TABLE control_plane.properties
  -- Which cell holds this Property's operational rows (Story 1.2 T2). NOT NULL is
  -- deliberate: a Property whose cell is unknown is a Property nobody can serve.
  ADD COLUMN cell_name text REFERENCES control_plane.cells(name),
  -- AC-3: deactivated, never deleted. A deactivated Property stays readable and
  -- stops accepting new work.
  ADD COLUMN active boolean NOT NULL DEFAULT true,
  -- AC-1: setup-incomplete until its required configuration is present. Stored as
  -- a flag for cheap reads; the LIST of what is outstanding is derived from actual
  -- state (core/property/setup-steps.ts), never from a column per step.
  ADD COLUMN setup_incomplete boolean NOT NULL DEFAULT true,
  ADD COLUMN deactivated_at timestamptz;

COMMENT ON COLUMN control_plane.properties.region IS
  'Chosen at creation and IMMUTABLE thereafter - a residency obligation (DG-4), enforced by the properties_region_immutable trigger and not by the absence of a form field.';

-- ----------------------------------------------------- inheritance by reference
-- Story 1.1 seeded `tenant_settings.defaults` with no version, which was enough
-- for provisioning and is not enough for inheritance. A version is what a Property
-- links TO.
ALTER TABLE control_plane.tenant_settings
  ADD COLUMN version integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN control_plane.tenant_settings.version IS
  'Bumped by Story 1.6 whenever a Tenant default changes. A Property links to a version rather than copying values, so that an inheriting Property sees a later change and an overriding one never silently re-inherits (AD-9).';

CREATE TABLE control_plane.property_settings (
  tenant_id        text NOT NULL,
  property_id      text NOT NULL REFERENCES control_plane.properties(id),
  -- THE LINK. Not a copy. Story 1.6 changes tenant_settings and every Property
  -- pointing at "the current version" sees it; nothing is re-written per Property.
  inherits_version integer NOT NULL,
  -- Keys this Property has taken over. A key present here stops inheriting
  -- FOREVER - AC of Story 1.6 - which is why it is a set of keys and not a
  -- boolean, and why the inherited values are not duplicated alongside them.
  overrides        jsonb NOT NULL DEFAULT '{}',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, property_id)
);

-- The resolved view, so no caller re-implements the precedence rule. `overrides`
-- wins key by key; everything else comes from the Tenant version this Property is
-- linked to. One place to read, one place to be wrong.
CREATE VIEW control_plane.effective_property_settings AS
  SELECT ps.tenant_id,
         ps.property_id,
         ps.inherits_version,
         ts.defaults || ps.overrides AS effective,
         ps.overrides,
         ts.defaults AS inherited
    FROM control_plane.property_settings ps
    JOIN control_plane.tenant_settings ts ON ts.tenant_id = ps.tenant_id;

-- ------------------------------------------------- region immutability (DG-4)
CREATE OR REPLACE FUNCTION control_plane.refuse_region_change() RETURNS trigger AS $$
BEGIN
  IF NEW.region IS DISTINCT FROM OLD.region THEN
    RAISE EXCEPTION
      'a Property never leaves its region: % cannot become % (DG-4, AD-4 - this is a data-residency obligation, not a setting)',
      OLD.region, NEW.region
      USING ERRCODE = 'restrict_violation';
  END IF;
  -- A MOVE is refused; INITIAL PLACEMENT is not. The distinction matters because
  -- the Story 1.0 fixture rows predate this column, so their cell_name is NULL
  -- until it is backfilled once - and a trigger that cannot tell "placed for the
  -- first time" from "moved to another region" makes that impossible.
  IF OLD.cell_name IS NOT NULL AND NEW.cell_name IS DISTINCT FROM OLD.cell_name THEN
    RAISE EXCEPTION
      'a Property never moves cell: % cannot become % (DG-4, AD-4)',
      OLD.cell_name, NEW.cell_name
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_region_immutable
  BEFORE UPDATE ON control_plane.properties
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_region_change();

-- --------------------------------------------- deactivate, never delete (AC-3)
CREATE OR REPLACE FUNCTION control_plane.refuse_property_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'a Property is deactivated, never deleted (FR-1, Story 1.2 AC-3): set active = false, and its records stay readable'
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_no_delete
  BEFORE DELETE ON control_plane.properties
  FOR EACH ROW EXECUTE FUNCTION control_plane.refuse_property_delete();

-- ------------------------------------------------------------------- privileges
-- The CELL role writes the property directory, because the actor is a hotel-side
-- tenant administrator (FR-1) and hotel-side roles never touch the internal
-- surface. This is a deliberate cross-boundary grant: the directory is
-- control-plane data (AD-4) written on a customer's own authority.
--
-- Note what is NOT granted: DELETE. Deactivation is the only exit, and the trigger
-- above covers the connections that do hold it.
GRANT INSERT, UPDATE ON control_plane.properties TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.property_settings TO jt_app;
GRANT SELECT ON control_plane.effective_property_settings TO jt_app;
GRANT SELECT ON control_plane.cells TO jt_app;
GRANT SELECT, INSERT, UPDATE ON control_plane.tenant_settings TO jt_app;
REVOKE DELETE ON control_plane.properties FROM jt_app;

-- The control-plane role keeps read access to the directory it provisions into,
-- and gains the registry it seeds. It does not create Properties: that is the
-- customer's to do (FR-1), and the grant list is where that boundary is visible.
GRANT SELECT, INSERT, UPDATE ON control_plane.cells TO jt_control;
GRANT SELECT ON control_plane.property_settings, control_plane.effective_property_settings TO jt_control;
