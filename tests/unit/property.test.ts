import { describe, it, expect } from 'vitest';
import {
  createProperty, deactivateProperty, assertRegionUnchanged,
  ValidationError, ConflictError, RegionImmutable,
} from '../../core/src/property/create';
import {
  SETUP_STEPS, outstandingSetupSteps, isSetupComplete,
} from '../../core/src/property/setup-steps';

const AT = new Date('2026-09-04T12:00:00.000Z');
const fixedRand = (): number => 0.5;
const PLACEMENT = { cellName: 'local-eu-west-1', region: 'eu-west-1' };
const OK = { tenantId: '01T-a', name: 'The Harbour', region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP' };

describe('creating a Property (Story 1.2, FR-1)', () => {
  it('records the region, the cell it was placed in, and that the region is now fixed', () => {
    const { event } = createProperty(OK, PLACEMENT, 4, AT, fixedRand);
    expect(event.type).toBe('PropertyCreated');
    expect(event.payload.region).toBe('eu-west-1');
    expect(event.payload.cellName).toBe('local-eu-west-1');
    expect(event.payload.setupIncomplete).toBe(true);
  });

  it('links to the Tenant settings VERSION rather than copying the values', () => {
    // Story 1.2 T1, and Story 1.6 depends on it: a Property that overrides a
    // default must stop inheriting permanently, which a copy cannot express.
    const { event } = createProperty(OK, PLACEMENT, 7, AT, fixedRand);
    expect(event.payload.inheritsSettingsVersion).toBe(7);
    // No settings VALUES in the event at all - if any appeared here, someone had
    // started copying.
    expect(Object.keys(event.payload).sort()).toEqual([
      'cellName', 'currency', 'inheritsSettingsVersion', 'name', 'region', 'setupIncomplete', 'timezone',
    ]);
  });

  it('refuses a placement that disagrees with the requested region', () => {
    // The caller resolves region to cell; this asserts the two agree rather than
    // trusting a placement that arrived from somewhere else.
    expect(() => createProperty(OK, { cellName: 'c', region: 'us-east-1' }, 1, AT, fixedRand))
      .toThrow(ValidationError);
  });

  it('requires a real IANA timezone, not merely a plausible one', () => {
    // A regex cannot know whether Europe/Atlantis exists; the runtime can.
    for (const timezone of ['Europe/Atlantis', 'Nowhere/Nowhere', 'GMT+25', '', 'Europe London']) {
      expect(() => createProperty({ ...OK, timezone }, PLACEMENT, 1, AT, fixedRand), timezone)
        .toThrow(ValidationError);
    }
    for (const timezone of ['Europe/London', 'UTC', 'America/Argentina/Ushuaia', 'Asia/Kolkata']) {
      expect(() => createProperty({ ...OK, timezone }, PLACEMENT, 1, AT, fixedRand), timezone).not.toThrow();
    }
  });

  it('normalises the currency and refuses anything that is not an ISO-4217 shape', () => {
    expect(createProperty({ ...OK, currency: 'gbp' }, PLACEMENT, 1, AT, fixedRand).event.payload.currency).toBe('GBP');
    for (const currency of ['GB', 'GBPP', '123', '', 'g£p']) {
      expect(() => createProperty({ ...OK, currency }, PLACEMENT, 1, AT, fixedRand), currency)
        .toThrow(ValidationError);
    }
  });

  it('trims the name and refuses an empty or over-long one', () => {
    expect(createProperty({ ...OK, name: '  The Harbour  ' }, PLACEMENT, 1, AT, fixedRand).event.payload.name)
      .toBe('The Harbour');
    for (const name of ['', '   ', 'x'.repeat(201)]) {
      expect(() => createProperty({ ...OK, name }, PLACEMENT, 1, AT, fixedRand)).toThrow(ValidationError);
    }
  });

  it('refuses a missing region, and says the choice is permanent', () => {
    try {
      createProperty({ ...OK, region: '' }, PLACEMENT, 1, AT, fixedRand);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as Error).message).toMatch(/cannot be changed later/);
    }
  });
});

describe('region immutability (AC-2)', () => {
  it('names residency as the reason, rather than answering a bare validation error', () => {
    try {
      assertRegionUnchanged('eu-west-1', 'us-east-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RegionImmutable);
      // The criterion is "with residency named as the reason" - so the word has
      // to be in the message a caller actually receives.
      expect((err as Error).message).toMatch(/residency/i);
      expect((err as Error).message).toContain('eu-west-1');
      expect((err as Error).message).toContain('us-east-1');
    }
  });

  it('is silent when nothing is being changed', () => {
    expect(() => assertRegionUnchanged('eu-west-1', 'eu-west-1')).not.toThrow();
    expect(() => assertRegionUnchanged('eu-west-1', undefined)).not.toThrow();
  });
});

describe('deactivation (AC-3)', () => {
  it('deactivates once and treats a second attempt as a conflict', () => {
    expect(deactivateProperty({ propertyId: '01P-a', active: true }, AT, fixedRand).type)
      .toBe('PropertyDeactivated');
    expect(() => deactivateProperty({ propertyId: '01P-a', active: false }, AT, fixedRand))
      .toThrow(ConflictError);
  });

  it('offers no deletion at all', () => {
    const surface = Object.keys({ createProperty, deactivateProperty, assertRegionUnchanged });
    expect(surface.some((k) => /delete|remove|destroy|purge/i.test(k))).toBe(false);
  });
});

describe('the outstanding setup list (AC-4)', () => {
  it('lists every step when nothing is configured, in the order the work happens', () => {
    const out = outstandingSetupSteps({});
    expect(out).toHaveLength(SETUP_STEPS.length);
    expect(out.map((s) => s.key)).toEqual([
      'departments', 'locations', 'rooms', 'staff', 'catalog', 'sla-targets', 'escalation', 'jazz-core',
    ]);
    // Positions are 1-based and consecutive, so a caller can render "3 of 8".
    expect(out.map((s) => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(isSetupComplete({})).toBe(false);
  });

  it('DERIVES the list from state - a step already done never appears', () => {
    // The whole point of T4. A hard-coded checklist would still be telling this
    // property administrator to add departments.
    const out = outstandingSetupSteps({ departments: 2, locations: 5, rooms: 120 });
    expect(out.map((s) => s.key)).toEqual(['staff', 'catalog', 'sla-targets', 'escalation', 'jazz-core']);
    // And the positions still reflect the true sequence, not the filtered one.
    expect(out[0]?.position).toBe(4);
  });

  it('is complete only when every step is satisfied', () => {
    const done = {
      departments: 1, locations: 1, rooms: 1, staffWithRoles: 1,
      catalogEntries: 1, slaTargets: 1, escalationChains: 1, jazzCoreConnected: true,
    };
    expect(outstandingSetupSteps(done)).toEqual([]);
    expect(isSetupComplete(done)).toBe(true);
    // One thing missing is enough to be incomplete.
    expect(isSetupComplete({ ...done, jazzCoreConnected: false })).toBe(false);
  });

  it('names the story that builds each step, so an outstanding item is traceable', () => {
    for (const step of SETUP_STEPS) {
      expect(step.story, step.key).toMatch(/^\d+\.\d+$/);
      expect(step.title.length, step.key).toBeGreaterThan(10);
    }
  });

  it('treats an absent count as zero rather than as satisfied', () => {
    // The failure mode this guards: a snapshot that cannot see a table yet
    // reporting "nothing to do".
    expect(outstandingSetupSteps({ departments: 0 }).some((s) => s.key === 'departments')).toBe(true);
    expect(outstandingSetupSteps({}).some((s) => s.key === 'departments')).toBe(true);
  });
});
