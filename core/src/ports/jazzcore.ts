/**
 * AD-5: Jazz Core is reached through ONE port with one owner, and
 * `adapters/jazzcore/` is the only place a Jazz Core type may exist.
 * Story 1.0 declares the port; Story 2.2 implements the adapter behind it.
 */
export interface JazzCorePort {
  /** Health only, in Story 1.0. Capability negotiation is Story 2.3. */
  probe(): Promise<{ reachable: boolean; checkedAt: Date }>;
}
