-- Story 1.2. The Story 1.0 isolation fixture predates Tenant settings, and Story
-- 1.2 makes them a precondition for creating a Property: a Property inherits the
-- Tenant defaults BY REFERENCE to their version (AD-9), so a Tenant with no
-- settings row has no version to link to.
--
-- This is a new file rather than an edit to 005 because 005 has been applied, and
-- "never edited after being applied" is the rule that keeps two environments from
-- diverging silently. Found by creating a Property under fixture Tenant A and
-- getting the handler's own honest refusal.
--
-- Fixture data only. Story 1.1 provisions real Tenants, and seeds their settings
-- as part of one transaction.
INSERT INTO control_plane.tenant_settings (tenant_id, defaults, version)
SELECT id, '{"locale": "en", "mfaRequired": false}'::jsonb, 1
  FROM control_plane.tenants
 WHERE id IN ('01T0000000000000000000000A', '01T0000000000000000000000B')
ON CONFLICT (tenant_id) DO NOTHING;

-- And the link Story 1.2 creates for every new Property, so the fixture Properties
-- are not an exception to the inheritance rule.
INSERT INTO control_plane.property_settings (tenant_id, property_id, inherits_version)
SELECT p.tenant_id, p.id, ts.version
  FROM control_plane.properties p
  JOIN control_plane.tenant_settings ts ON ts.tenant_id = p.tenant_id
 WHERE NOT EXISTS (
   SELECT 1 FROM control_plane.property_settings ps
    WHERE ps.tenant_id = p.tenant_id AND ps.property_id = p.id);
