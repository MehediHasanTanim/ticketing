# Per-intent offline conflict rules (AD-7)

Populated by **Story 4.4**, which owns the rule table and its release gate. The rules
live here as data, not as code in either language, so the suite and the implementation
read one source and a non-engineer can review them.

Story 1.0 creates the directory and the gate's place in CI. Two rules are already
fixed by the architecture and recorded here for 4.4 to encode:

- a supervisor's reassignment **beats** a queued start;
- a completion is **never lost** - it lands on the reassigned Job.
