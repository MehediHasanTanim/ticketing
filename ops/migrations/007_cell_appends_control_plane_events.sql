-- Story 1.2. `PropertyCreated` and `PropertyDeactivated` are control-plane facts
-- written by the CELL role, because the actor is a hotel-side tenant administrator
-- acting on their own authority (FR-1). Migration 004 granted the control-plane
-- event log to `jt_control` only, so the first Property creation failed with
-- "permission denied for table events" - found by running it, not by reading it.
--
-- A third migration for one story rather than an edit to 005 or 006: both are
-- applied, and "never edited after being applied" is what keeps two environments
-- from diverging silently.
--
-- APPEND-ONLY, on the same terms as cell.events: INSERT and SELECT, with UPDATE,
-- DELETE and TRUNCATE revoked at the storage layer rather than by an application
-- rule a later migration can relax.
GRANT SELECT, INSERT ON control_plane.events TO jt_app;
GRANT USAGE, SELECT ON SEQUENCE control_plane.events_seq_seq TO jt_app;
REVOKE UPDATE, DELETE, TRUNCATE ON control_plane.events FROM jt_app;
