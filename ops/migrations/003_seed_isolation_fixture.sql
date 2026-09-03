-- Story 1.0 / AC-4: two seeded tenants so the isolation suite has two sides.
-- Fixture data only. Story 1.1 provisions Tenants for real.
INSERT INTO control_plane.tenants (id, name) VALUES
  ('01T0000000000000000000000A', 'Fixture Tenant A'),
  ('01T0000000000000000000000B', 'Fixture Tenant B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO control_plane.properties (id, tenant_id, name, region, timezone, currency) VALUES
  ('01P0000000000000000000000A', '01T0000000000000000000000A', 'Fixture Property A', 'eu-west-1', 'Europe/London', 'GBP'),
  ('01P0000000000000000000000B', '01T0000000000000000000000B', 'Fixture Property B', 'eu-west-1', 'Europe/London', 'GBP')
ON CONFLICT (id) DO NOTHING;
