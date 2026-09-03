/** AD-2: the domain never reads a system clock directly. */
export interface ClockPort {
  /** The system clock, injected. `recorded_at` comes from here. */
  now(): Date;
}
