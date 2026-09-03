import type { ClockPort } from '../../core/src/ports';

/** The one place a system clock is read. core/ never reads it (AD-2). */
export const systemClock: ClockPort = { now: () => new Date() };
