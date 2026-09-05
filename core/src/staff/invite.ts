import { ulid } from '../ids';
import { ValidationError } from '../validation';
import { type GrantScope } from './roles';

export { ValidationError };

/**
 * The Staff Member aggregate (Story 1.3 T1). Pure: no I/O, no clock of its own, no
 * npm dependency.
 *
 * AC-1 is exact about the outcome - "the Staff Member is created with EXACTLY those
 * roles at exactly those Properties" - so this function's job is to turn a request
 * into that fact or refuse it, with nothing added and nothing dropped.
 */

/**
 * AD-12: one localisation and direction contract, and Arabic ships in R1. A language
 * outside this list is REFUSED rather than stored and silently fallen back from: a
 * Staff Member whose language the product cannot render would be told, at sign-in,
 * in a language they did not choose - and nobody would know why.
 */
export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Six digits. Story 4.1 owns the sign-in flow, the lockout policy and the rate limit. */
export const PIN_LENGTH = 6;

const MAX_NAME = 200;
const MAX_EMAIL = 320;

/**
 * DG-5 governs staff data, and the story is explicit: "do not add payroll identifiers
 * or dates of birth to this model, and DO NOT ACCEPT THEM FROM ANY CALLER."
 *
 * The request schema is `additionalProperties: false`, so anything unexpected is
 * refused - but a caller who sent `payrollId` deserves to be told which rule they hit
 * rather than a generic "unknown field". Silently ignoring it would be the worst of
 * the three: the caller believes it was stored, and nothing holds it.
 */
const DG5_FORBIDDEN = new Set([
  'payrollid', 'payroll', 'payrollnumber', 'employeenumber', 'employeeid', 'staffnumber',
  'dateofbirth', 'dob', 'birthdate', 'birthday', 'nationalid', 'ssn', 'socialsecuritynumber',
  'passportnumber', 'taxid', 'salary', 'wage', 'bankaccount', 'iban',
]);

const ALLOWED_KEYS = new Set(['name', 'languageTag', 'email', 'roles']);

export interface RoleAssignmentInput {
  /** Absent for a Tenant-wide grant. */
  propertyId?: string;
  roleKey: string;
}

/** One stored `staff_roles` row, after normalisation. */
export interface NormalisedRole {
  propertyId: string | null;
  roleKey: string;
  scope: GrantScope;
}

export type CredentialPath = 'set_up_link' | 'pin';

interface EventBase {
  eventId: string;
  tenantId: string;
  /**
   * NULL by design, and for a different reason than Story 1.1's: a Staff Member
   * belongs to a Tenant and holds roles at zero or more Properties, so no single
   * Property can be named. Migration 008 adds both types to the CHECK that lists
   * AD-3's permitted exceptions, so the exception stays explicit.
   */
  propertyId: undefined;
  occurredAt: string;
  recordedAt: string;
}

export interface StaffMemberInvited extends EventBase {
  type: 'StaffMemberInvited';
  payload: {
    staffMemberId: string;
    name: string;
    languageTag: SupportedLanguage;
    /**
     * WHETHER, not what. The address itself is in the row and in the outbox; putting
     * it in an append-only event log as well would mean a Staff Member's address can
     * never be corrected or erased, which DG-5 has opinions about.
     */
    hasEmail: boolean;
    credentialPath: CredentialPath;
    invitedBy: string;
  };
}

export interface RolesAssigned extends EventBase {
  type: 'RolesAssigned';
  payload: {
    staffMemberId: string;
    roles: ReadonlyArray<{ propertyId: string | null; roleKey: string }>;
  };
}

export interface InviteResult {
  staffMemberId: string;
  name: string;
  languageTag: SupportedLanguage;
  email: string | null;
  credentialPath: CredentialPath;
  roles: NormalisedRole[];
  events: [StaffMemberInvited, RolesAssigned];
}

/**
 * A shape good enough to refuse the obviously wrong, deliberately not RFC 5322: the
 * address is proved by the invitation arriving, and a clever regex rejects real
 * addresses while accepting unusable ones. Same rule as Story 1.1's.
 */
const looksLikeEmail = (s: string): boolean =>
  /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(s) && s.length <= MAX_EMAIL;

/**
 * @param catalogue the Tenant's own roles, read from `control_plane.roles` - their
 *   keys AND whether each may be held Tenant-wide. NOT a constant: Story 1.4 lets a
 *   Tenant define its own roles and decide that question for them, and a picker or a
 *   guard reading a constant would never see one. Validating against the Tenant's
 *   catalogue also means a role key from ANOTHER Tenant is refused here rather than by
 *   a foreign key at the end of a transaction.
 */
export function inviteStaffMember(
  input: unknown,
  catalogue: ReadonlyArray<{ key: string; assignableAtTenantScope: boolean }>,
  invitedBy: string,
  tenantId: string,
  now: Date,
  rand: () => number = Math.random,
): InviteResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('an invitation needs a name, a language and at least one role');
  }
  const body = input as Record<string, unknown>;

  // ---- what we refuse to accept at all (DG-5) ----
  for (const key of Object.keys(body)) {
    if (ALLOWED_KEYS.has(key)) continue;
    if (DG5_FORBIDDEN.has(key.toLowerCase().replace(/[^a-z]/g, ''))) {
      throw new ValidationError(
        `${key} is not accepted: staff data here is governed by DG-5, which excludes payroll `
        + 'identifiers, dates of birth and government identifiers. It is refused rather than '
        + 'ignored, so nobody believes it was stored.');
    }
    throw new ValidationError(`${key} is not a field of an invitation`);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new ValidationError('a Staff Member needs a name');
  if (name.length > MAX_NAME) throw new ValidationError(`name must be at most ${MAX_NAME} characters`);

  const languageTag = typeof body.languageTag === 'string' ? body.languageTag.trim() : '';
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(languageTag)) {
    throw new ValidationError(
      `languageTag must be one of ${SUPPORTED_LANGUAGES.join(', ')} (AD-12: English and Arabic ship in R1). `
      + 'A language the product cannot render is refused rather than stored and fallen back from.');
  }

  let email: string | null = null;
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !looksLikeEmail(body.email.trim())) {
      throw new ValidationError('email is not an address');
    }
    email = body.email.trim();
  }
  // ONE FIELD DECIDES WHICH ACCOUNT THIS IS (AC-1). An address means a credential
  // set-up link; no address means a PIN-only account for a Shared Device.
  const credentialPath: CredentialPath = email ? 'set_up_link' : 'pin';

  if (!Array.isArray(body.roles) || body.roles.length === 0) {
    throw new ValidationError('an invitation needs at least one Property/role pair');
  }
  // key -> whether it may be held Tenant-wide, straight from `control_plane.roles`.
  const known = new Map(catalogue.map((r) => [r.key, r.assignableAtTenantScope === true]));
  const seen = new Set<string>();
  const roles: NormalisedRole[] = [];
  for (const raw of body.roles as unknown[]) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new ValidationError('each role must be an object with a roleKey and an optional propertyId');
    }
    const pair = raw as Record<string, unknown>;
    for (const key of Object.keys(pair)) {
      if (key !== 'propertyId' && key !== 'roleKey') {
        throw new ValidationError(`${key} is not a field of a role assignment`);
      }
    }
    const roleKey = typeof pair.roleKey === 'string' ? pair.roleKey.trim() : '';
    if (!roleKey) throw new ValidationError('each role assignment needs a roleKey');
    if (!known.has(roleKey)) {
      throw new ValidationError(`${roleKey} is not a role in this Tenant`);
    }
    const propertyId = typeof pair.propertyId === 'string' && pair.propertyId.trim()
      ? pair.propertyId.trim() : null;
    const scope: GrantScope = propertyId ? 'property' : 'tenant';
    // READ FROM THE TENANT'S CATALOGUE, not from a constant. Story 1.3 checked a
    // hard-coded list of the two shipped roles that may be held Tenant-wide, which was
    // right until Story 1.4 let a hotel DEFINE one - a custom role marked assignable
    // Tenant-wide would have been refused by a list it could never appear in. Caught by
    // running the two stories together, not by the type system: both are `string`.
    if (scope === 'tenant' && !known.get(roleKey)) {
      throw new ValidationError(
        `${roleKey} must be assigned at a Property: a role granted Tenant-wide applies at every `
        + 'Property in the Tenant, which is a privilege grant nobody asked for. A role can be '
        + 'made assignable Tenant-wide in the role editor (Story 1.4), by somebody who already '
        + 'holds Tenant-wide authority themselves.');
    }
    // Exact duplicates collapse; the same Property with two different roles does not,
    // because holding both front office and duty manager at one Property is ordinary.
    const fingerprint = `${propertyId ?? ''}|${roleKey}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    roles.push({ propertyId, roleKey, scope });
  }

  const staffMemberId = `01S${ulid(now, rand).slice(3)}`;
  const stamp = now.toISOString();
  const base = { tenantId, propertyId: undefined, occurredAt: stamp, recordedAt: stamp } as const;

  return {
    staffMemberId, name, languageTag: languageTag as SupportedLanguage, email, credentialPath, roles,
    events: [
      {
        ...base, eventId: ulid(now, rand), type: 'StaffMemberInvited',
        payload: { staffMemberId, name, languageTag: languageTag as SupportedLanguage, hasEmail: email !== null, credentialPath, invitedBy },
      },
      {
        ...base, eventId: ulid(now, rand), type: 'RolesAssigned',
        payload: { staffMemberId, roles: roles.map((r) => ({ propertyId: r.propertyId, roleKey: r.roleKey })) },
      },
    ],
  };
}

/**
 * The one refusal that has to happen per PAIR rather than per request (AC-4).
 *
 * An administrator with `staff.invite` at the Harbour may not grant a role at the
 * Quay. Both refusals are the same call, and they answer differently on purpose:
 *
 *   - a Property in ANOTHER TENANT is `not_found`, because answering `forbidden`
 *     would confirm that it exists;
 *   - a Property in THIS Tenant that the caller holds no authority over is
 *     `forbidden`, because they already know it exists.
 *
 * This function decides which, and returns the verdict rather than throwing, so the
 * edge maps it to a status once.
 */
export type PairVerdict = 'permitted' | 'not_found' | 'forbidden';

export function verdictForPair(
  pair: NormalisedRole,
  context: {
    /** Property ids in the CALLER'S Tenant. A pair naming anything else is not_found. */
    propertiesInTenant: ReadonlySet<string>;
    /** Where the caller may invite: Property ids, plus whether they may Tenant-wide. */
    mayInviteAtProperty: ReadonlySet<string>;
    mayInviteTenantWide: boolean;
  },
): PairVerdict {
  if (pair.propertyId === null) {
    // Granting Tenant-wide authority needs Tenant-wide authority. A property
    // administrator at one Property creating a corporate viewer over the whole estate
    // is exactly the escalation AC-4 is about.
    return context.mayInviteTenantWide ? 'permitted' : 'forbidden';
  }
  if (!context.propertiesInTenant.has(pair.propertyId)) return 'not_found';
  if (context.mayInviteTenantWide) return 'permitted';
  return context.mayInviteAtProperty.has(pair.propertyId) ? 'permitted' : 'forbidden';
}
