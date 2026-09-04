/**
 * AC-4: "the outstanding configuration steps are listed in the order they must be
 * completed" - and Story 1.2 T4 requires them "derived from what is actually
 * missing rather than a hard-coded checklist".
 *
 * The distinction matters more than it looks. A hard-coded list drifts the moment a
 * step is added, removed or reordered, and it will happily tell a property
 * administrator to do something they have already done. So each step declares a
 * PREDICATE over real state, and the outstanding list is whatever the predicates
 * say. `core/` stays pure: the predicates read a snapshot the adapter gathered, not
 * a database.
 *
 * The steps NAME work that later stories build (1.7 Departments/Locations/Rooms,
 * 1.8 Catalog and SLA Targets, 1.9 Pause Conditions and Escalation, 2.2 the Jazz
 * Core connection). Naming them is explicitly allowed by this story's scope guard;
 * implementing them is not. Until each lands, its counter is zero and its step is
 * outstanding - which is the truth, not a placeholder.
 */

/** What the adapter can actually count today. Absent counts mean "nothing yet". */
export interface PropertySetupSnapshot {
  departments?: number;
  locations?: number;
  rooms?: number;
  catalogEntries?: number;
  slaTargets?: number;
  escalationChains?: number;
  staffWithRoles?: number;
  jazzCoreConnected?: boolean;
}

export interface SetupStep {
  key: string;
  /** Shown to a property administrator. */
  title: string;
  /** The story that builds this step, so an outstanding item is traceable. */
  story: string;
  /** True when the step is done. */
  satisfied: (s: PropertySetupSnapshot) => boolean;
}

/**
 * ORDER IS THE CONTRACT. Rooms cannot be placed without Locations; an SLA Target
 * is meaningless without a Catalog Entry to attach it to; an Escalation chain
 * needs someone to escalate to. The sequence below is the order the work actually
 * has to happen in, which is what AC-4 asks to be shown.
 */
export const SETUP_STEPS: readonly SetupStep[] = [
  {
    key: 'departments',
    title: 'Add the departments that do the work',
    story: '1.7',
    satisfied: (s) => (s.departments ?? 0) > 0,
  },
  {
    key: 'locations',
    title: 'Describe the building: locations and floors',
    story: '1.7',
    satisfied: (s) => (s.locations ?? 0) > 0,
  },
  {
    key: 'rooms',
    title: 'Add the rooms',
    story: '1.7',
    // Rooms sit inside locations, so this step is only reachable after the one above.
    satisfied: (s) => (s.rooms ?? 0) > 0,
  },
  {
    key: 'staff',
    title: 'Invite the first people and give them roles',
    story: '1.3',
    satisfied: (s) => (s.staffWithRoles ?? 0) > 0,
  },
  {
    key: 'catalog',
    title: 'Choose what guests and staff can ask for',
    story: '1.8',
    satisfied: (s) => (s.catalogEntries ?? 0) > 0,
  },
  {
    key: 'sla-targets',
    title: 'Set the response and completion targets',
    story: '1.8',
    // An SLA Target attaches to a Catalog Entry, so it cannot precede one.
    satisfied: (s) => (s.slaTargets ?? 0) > 0,
  },
  {
    key: 'escalation',
    title: 'Decide who hears about a job that breaches',
    story: '1.9',
    satisfied: (s) => (s.escalationChains ?? 0) > 0,
  },
  {
    key: 'jazz-core',
    title: 'Connect Jazz Core so rooms and stays arrive on their own',
    story: '2.2',
    satisfied: (s) => s.jazzCoreConnected === true,
  },
];

export interface OutstandingStep {
  key: string;
  title: string;
  story: string;
  /** 1-based, so a caller can render "3 of 8" without recounting. */
  position: number;
}

/** The outstanding steps, in order. Empty means setup is complete. */
export function outstandingSetupSteps(snapshot: PropertySetupSnapshot): OutstandingStep[] {
  const out: OutstandingStep[] = [];
  SETUP_STEPS.forEach((step, i) => {
    if (!step.satisfied(snapshot)) {
      out.push({ key: step.key, title: step.title, story: step.story, position: i + 1 });
    }
  });
  return out;
}

/**
 * AC-1's `setup_incomplete` flag, derived from the same predicates rather than
 * maintained beside them - two sources of truth for "is setup done" is how a
 * Property ends up marked complete with steps outstanding.
 */
export const isSetupComplete = (snapshot: PropertySetupSnapshot): boolean =>
  outstandingSetupSteps(snapshot).length === 0;
