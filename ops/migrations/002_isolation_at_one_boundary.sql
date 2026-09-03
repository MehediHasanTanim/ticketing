-- Story 1.0 / AC-4. AD-3: "isolation lives at ONE boundary".
--
-- The application role always passes a scope, but belt AND braces: row-level
-- security means a query that forgets its predicate returns nothing rather than
-- another tenant's rows. The isolation gate attacks the API; RLS is what makes a
-- future forgotten WHERE clause a non-event instead of an incident.

CREATE ROLE jt_app LOGIN PASSWORD 'jt_app_local_only' NOSUPERUSER NOBYPASSRLS;

GRANT USAGE ON SCHEMA cell, control_plane TO jt_app;
GRANT SELECT, INSERT ON cell.events TO jt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON cell.fixture_notes TO jt_app;
GRANT SELECT, INSERT ON cell.idempotency TO jt_app;
GRANT SELECT ON control_plane.tenants, control_plane.properties TO jt_app;
GRANT USAGE, SELECT ON SEQUENCE cell.events_seq_seq TO jt_app;

-- Append-only: the application role cannot rewrite or erase history.
-- (1.11's audit trail depends on this being true at the storage layer.)
REVOKE UPDATE, DELETE, TRUNCATE ON cell.events FROM jt_app;

ALTER TABLE cell.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell.fixture_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_scope ON cell.events
  USING (tenant_id = current_setting('app.tenant_id', true)
     AND property_id = current_setting('app.property_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)
     AND property_id = current_setting('app.property_id', true));

CREATE POLICY fixture_notes_scope ON cell.fixture_notes
  USING (tenant_id = current_setting('app.tenant_id', true)
     AND property_id = current_setting('app.property_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)
     AND property_id = current_setting('app.property_id', true));
