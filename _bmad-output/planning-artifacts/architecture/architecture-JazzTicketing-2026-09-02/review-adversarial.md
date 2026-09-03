# Reviewer gate — adversarial pass

Method from `{workflow.finalize_reviewers}`: construct two units one level down that each obey **every** AD to the letter and still build incompatibly. Every pair found is a hole to close.

## Holes found and closed

**1. Two owners of Room status.** `core/housekeeping` completes a Room Assignment and flips cleanliness; `core/room` owns Room status and authority. Both obeyed AD-1 (event-sourced), AD-3 (scoped) and AD-6 (authority between us and Jazz Core) — AD-6 only settled *Jazz Core versus us*, never *which internal module* owns the write. Two event shapes for one fact, and a projection that counts it twice. → **Closed by AD-13** (one writing owner per aggregate; everyone else issues a command).

**2. Two evaluators of notification suppression.** AD-8 put suppression in the domain but not in a named module. `core/job` and a saga could each evaluate quiet hours and coalescing, double-sending on escalation. → **Closed by AD-13**, which names `app/notification` as the sole dispatch owner.

**3. Two implementations of the SLA fold — the worst one.** Nothing in the original set stopped the dashboard projection and the month-end report each deciding how to treat paused time, a reassignment, or a job that breached while a device was offline. Both would be compliant and the two numbers would differ, which destroys SM-2 as a metric and every argument built on it. → **Closed by AD-14** (one pure fold in `core/job`, called by everything, fixed by a shared fixture suite both server and client run).

**4. Idempotency key scope.** AD-7 required server idempotency on a client key but never scoped the key. One team scoping per-device and another per-staff-member is a collision across shifts on a shared handset — the exact device model this product uses. → **Closed by tightening AD-7** to `(tenant, property, staff_member, client_key)`, retained 30 days.

**5. Which configuration version a late evaluation reads.** AD-9 bound a config version at Job creation, but escalation fires hours later. A saga reading *current* configuration and a handler reading the *bound* version both obey AD-9 as written. → **Closed by tightening AD-9**: the bound version governs the Job's entire life, and a saga reading current config is a defect.

## Unmet reviewer requirement — stated, not hidden

The second finalize reviewer requires that every named technology be web-confirmed rather than asserted from training data. **Web access is blocked in this session, so this check did not run.** Every row of the Stack table is therefore unverified, and the spine says so in place rather than implying confidence it does not have. The paradigm and all fourteen ADs are independent of those versions; nothing in the invariants depends on a version being current.

## Mechanical lint

`lint_spine.py` — 5 low findings on the first pass, all unresolved `{planning_artifacts}` tokens in frontmatter sources. Resolved to relative paths; re-run clean.
