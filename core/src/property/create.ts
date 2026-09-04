import { ulid } from '../ids';
import { ValidationError } from '../validation';

export { ValidationError };

/**
 * The Property aggregate (Story 1.2). Pure: no I/O, no clock of its own, no npm
 * dependency - `core/` may import none.
 *
 * REGION IS THE ONE IRREVERSIBLE DECISION A CUSTOMER MAKES IN THIS PRODUCT, so it
 * is enforced here as well as in the database (migration 005's trigger) and absent
 * from every update path. Three places, deliberately: the story's own note is that
 * it must be enforced "in the domain, not the form".
 */

export interface PropertyCreated {
  eventId: string;
  type: 'PropertyCreated';
  tenantId: string;
  propertyId: string;
  occurredAt: string;
  recordedAt: string;
  payload: {
    name: string;
    region: string;
    cellName: string;
    timezone: string;
    currency: string;
    /**
     * The Tenant defaults version this Property LINKS TO. Not the values - Story
     * 1.2 T1 and Story 1.6 both depend on inheritance being a reference, because
     * a Property that overrides a default must stop inheriting it permanently and
     * a copy cannot express that.
     */
     inheritsSettingsVersion: number;
    setupIncomplete: true;
  };
}

const MAX_NAME = 200;

/**
 * ISO-4217 shape only. A closed list of live currency codes belongs to reference
 * data that changes without us, and rejecting a real code because our list is a
 * year old is worse than accepting a typo that shows up immediately in an invoice.
 * Money is stored as minor-unit integers plus the code (Consistency Conventions);
 * no conversion happens in v1.
 */
const isCurrencyCode = (s: string): boolean => /^[A-Z]{3}$/.test(s);

/**
 * IANA zone shape, checked structurally and then CONFIRMED BY THE RUNTIME below -
 * a regex cannot know whether `Europe/Atlantis` exists, and `Intl` can.
 */
const isTimezoneShape = (s: string): boolean =>
  /^[A-Za-z][A-Za-z0-9+_-]*(\/[A-Za-z0-9+_.-]+){1,2}$/.test(s) || s === 'UTC';

/**
 * Ask the platform rather than carry a list. `timeZone` throws a RangeError for an
 * unknown zone, which is exactly the check we want and one that stays current with
 * the host's tzdata. Timezone is presentation only; storage stays UTC (AD-2).
 */
const isRealTimezone = (s: string): boolean => {
  try { new Intl.DateTimeFormat('en', { timeZone: s }); return true; }
  catch { return false; }
};

export interface CreatePropertyInput {
  tenantId: string;
  name: string;
  region: string;
  timezone: string;
  currency: string;
}

export function createProperty(
  input: CreatePropertyInput,
  placement: { cellName: string; region: string },
  tenantSettingsVersion: number,
  now: Date,
  rand: () => number = Math.random,
): { event: PropertyCreated; propertyId: string } {
  const name = input.name?.trim() ?? '';
  if (!name) throw new ValidationError('a Property needs a name');
  if (name.length > MAX_NAME) throw new ValidationError(`name must be at most ${MAX_NAME} characters`);

  const region = input.region?.trim() ?? '';
  if (!region) throw new ValidationError('a Property needs a region, and it cannot be changed later (DG-4)');
  // The caller resolves the region to a cell; this asserts the two agree rather
  // than trusting a placement that came from somewhere else.
  if (placement.region !== region) {
    throw new ValidationError(`placement is for region ${placement.region}, not ${region}`);
  }
  if (!placement.cellName) throw new ValidationError('a Property must be placed in a cell (AD-4)');

  const timezone = input.timezone?.trim() ?? '';
  if (!isTimezoneShape(timezone) || !isRealTimezone(timezone)) {
    throw new ValidationError(`timezone must be an IANA zone such as Europe/London; got ${JSON.stringify(timezone)}`);
  }

  const currency = input.currency?.trim().toUpperCase() ?? '';
  if (!isCurrencyCode(currency)) {
    throw new ValidationError('currency must be a three-letter ISO-4217 code such as GBP');
  }

  const propertyId = `01P${ulid(now, rand).slice(3)}`;
  const stamp = now.toISOString();

  return {
    propertyId,
    event: {
      eventId: ulid(now, rand),
      type: 'PropertyCreated',
      tenantId: input.tenantId,
      propertyId,
      occurredAt: stamp,
      recordedAt: stamp,
      payload: {
        name,
        region,
        cellName: placement.cellName,
        timezone,
        currency,
        inheritsSettingsVersion: tenantSettingsVersion,
        setupIncomplete: true,
      },
    },
  };
}

export class RegionImmutable extends Error {
  public readonly code = 'forbidden' as const;
  constructor(from: string, to: string) {
    super(`a Property never leaves its region: ${from} cannot become ${to}. `
      + 'This is a data-residency obligation (DG-4, AD-4), not a setting.');
  }
}

export class ConflictError extends Error {
  public readonly code = 'conflict' as const;
}

/**
 * AC-2. There is no update path that accepts a region, so this exists for the one
 * caller that might try: it names residency as the reason, which the criterion
 * requires, rather than answering a bare 400.
 */
export function assertRegionUnchanged(current: string, requested: string | undefined): void {
  if (requested !== undefined && requested !== current) throw new RegionImmutable(current, requested);
}

/** AC-3. Deactivation is the only exit, and a second one is a conflict. */
export function deactivateProperty(
  state: { propertyId: string; active: boolean },
  now: Date,
  rand: () => number = Math.random,
): { eventId: string; type: 'PropertyDeactivated'; propertyId: string; occurredAt: string; recordedAt: string } {
  if (!state.active) throw new ConflictError('this Property is already deactivated');
  const stamp = now.toISOString();
  return {
    eventId: ulid(now, rand), type: 'PropertyDeactivated',
    propertyId: state.propertyId, occurredAt: stamp, recordedAt: stamp,
  };
}
