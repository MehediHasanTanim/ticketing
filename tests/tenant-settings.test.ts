import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Client } from 'pg';
import { start, type Harness } from './harness';
import { hashCredential } from '../adapters/src/crypto/credential';
import { closeControlPool } from '../adapters/src/postgres/control-plane-pool';
import { resetLimiter } from '../edge/src/rate-limit';
import { ulid } from '../core/src/ids';

/**
 * Story 1.6 at the boundary, over the fixture the testing note asks for: THREE
 * inheriting Properties and TWO overriding ones.
 *
 * The blast radius is the feature, so the assertions are about the number being true of
 * the moment it is read rather than about a change succeeding. And the inheritance
 * matrix is run TWICE in a row, because "override until the Tenant value changes" is
 * the wrong model that passes a single pass.
 */

const admin = async (): Promise<Client> => {
  const c = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
  await c.connect();
  return c;
};

const OPERATOR_PASSWORD = 'test-operator-credential-not-a-real-one';
const ADMIN_PASSWORD = 'a-tenant-administrator-password';
const json = { 'content-type': 'application/json' };
const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}`, ...json });

interface Setting {
  key: string; value: unknown; scope: string;
  inheritingPropertyCount: number;
  overriddenBy: Array<{ propertyId: string; value: unknown }>;
  governance?: string; maximum?: number;
}
interface TenantView {
  settings: Setting[]; propertyCount: number;
  regions: Array<{ propertyId: string; region: string; name: string }>;
}

describe('Tenant defaults and their blast radius', () => {
  let h: Harness;
  let tenantId = '';
  let token = '';
  let staffMemberId = '';
  /** Three that inherit, two that override - the fixture the testing note specifies. */
  const inheriting: string[] = [];
  const overriding: string[] = [];

  const drainOutbox = async (kind: string, email: string): Promise<string> => {
    const c = await admin();
    try {
      const res = await c.query<{ payload: { token: string } }>(
        `SELECT payload FROM control_plane.outbox
          WHERE kind = $1 AND payload->>'email' = $2 ORDER BY id DESC LIMIT 1`, [kind, email]);
      const t = res.rows[0]?.payload?.token;
      if (!t) throw new Error(`no ${kind} queued for ${email}`);
      return t;
    } finally { await c.end(); }
  };

  const tenantSettings = async (as = token): Promise<TenantView> => {
    const res = await fetch(`${h.base}/v1/tenant/settings`, { headers: bearer(as) });
    expect(res.status, await res.clone().text()).toBe(200);
    return res.json() as Promise<TenantView>;
  };
  const setting = (view: TenantView, key: string): Setting =>
    view.settings.find((s) => s.key === key)!;

  const patchTenant = async (body: unknown, as = token): Promise<Response> =>
    fetch(`${h.base}/v1/tenant/settings`, { method: 'PATCH', headers: bearer(as), body: JSON.stringify(body) });
  const patchProperty = async (propertyId: string, body: unknown, as = token): Promise<Response> =>
    fetch(`${h.base}/v1/properties/${propertyId}/settings`, {
      method: 'PATCH', headers: bearer(as), body: JSON.stringify(body),
    });
  const propertySettings = async (propertyId: string, as = token): Promise<{
    region: string; regionImmutable: boolean;
    settings: Array<{ key: string; value: unknown; inherited: boolean; tenantValue: unknown; scope: string }>;
  }> => {
    const res = await fetch(`${h.base}/v1/properties/${propertyId}/settings`, { headers: bearer(as) });
    expect(res.status, await res.clone().text()).toBe(200);
    return res.json() as never;
  };

  beforeAll(async () => {
    resetLimiter();
    h = await start();
    const operatorId = `01O${ulid(new Date()).slice(3)}`;
    const c = await admin();
    try {
      const { hash, salt } = hashCredential(OPERATOR_PASSWORD);
      await c.query(
        `INSERT INTO control_plane.operator_accounts
           (id, email, display_name, scopes, credential_hash, credential_salt, active)
         VALUES ($1, $2, 'Story 1.6 suite operator', $3, $4, $5, true)`,
        [operatorId, `${operatorId.toLowerCase()}@jazzware.test`, ['provision:tenant'], hash, salt]);
    } finally { await c.end(); }
    const signIn = await fetch(`${h.base}/control/v1/operator/sign-in`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ email: `${operatorId.toLowerCase()}@jazzware.test`, password: OPERATOR_PASSWORD }),
    });
    const operatorToken = (await signIn.json() as { token: { accessToken: string } }).token.accessToken;

    const email = `settings-admin-${ulid(new Date()).toLowerCase()}@hotel.test`;
    const created = await fetch(`${h.base}/control/v1/tenants`, {
      method: 'POST', headers: bearer(operatorToken),
      body: JSON.stringify({ name: 'Story 1.6 Group', firstAdministratorEmail: email }),
    });
    expect(created.status, await created.clone().text()).toBe(201);
    tenantId = (await created.json() as { tenantId: string }).tenantId;
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('tenant_administrator_invitation', email),
        password: ADMIN_PASSWORD, name: 'Settings administrator', languageTag: 'en',
      }),
    });
    expect(setUp.status, await setUp.clone().text()).toBe(200);
    const session = await setUp.json() as { accessToken: string; session: { staffMemberId: string } };
    token = session.accessToken;
    staffMemberId = session.session.staffMemberId;

    for (let i = 0; i < 5; i += 1) {
      const res = await fetch(`${h.base}/v1/properties`, {
        method: 'POST', headers: bearer(token),
        body: JSON.stringify({
          name: `Property ${i + 1}`, region: 'eu-west-1', timezone: 'Europe/London', currency: 'GBP',
        }),
      });
      expect(res.status, await res.clone().text()).toBe(201);
      const id = (await res.json() as { propertyId: string }).propertyId;
      (i < 3 ? inheriting : overriding).push(id);
    }
  });

  afterAll(async () => { await h?.stop(); await closeControlPool(); });
  beforeEach(() => { resetLimiter(); });

  // ------------------------------------------------------------------------ AC-1

  it('states the blast radius of every default, counted from real state', async () => {
    const view = await tenantSettings();
    expect(view.propertyCount).toBe(5);
    // Nothing is overridden yet, so a change to any default reaches all five. That is
    // the number an administrator decides on, and it has to describe the same moment
    // they are looking at.
    for (const s of view.settings) {
      expect(s.inheritingPropertyCount, s.key).toBe(5);
      expect(s.overriddenBy, s.key).toEqual([]);
    }
    // Governance settings say which rule they exist for (AC-3).
    expect(setting(view, 'crossTenantGuestHistory').governance).toMatch(/FR-45/);
    expect(setting(view, 'guestDataRetentionDays').governance).toMatch(/DG-2/);
    expect(setting(view, 'guestDataRetentionDays').maximum).toBeGreaterThan(0);
    // FR-45's default is off, and the surface says so rather than leaving it unset.
    expect(setting(view, 'crossTenantGuestHistory').value).toBe(false);
  });

  it('counts three inheriting and two overriding once two Properties take a default over', async () => {
    for (const id of overriding) {
      const res = await patchProperty(id, { locale: 'ar' });
      expect(res.status, await res.clone().text()).toBe(200);
    }
    const view = await tenantSettings();
    const locale = setting(view, 'locale');
    expect(locale.inheritingPropertyCount).toBe(3);
    expect(locale.overriddenBy.map((o) => o.propertyId).sort()).toEqual([...overriding].sort());
    // WHO is unaffected, and what they hold instead - "3 of 5" without the names is a
    // number nobody can act on.
    expect(locale.overriddenBy.every((o) => o.value === 'ar')).toBe(true);

    // A TENANT-ONLY setting still reaches everybody, because nobody can decline it.
    // Saying five is the honest number, and the more alarming one.
    expect(setting(view, 'guestDataRetentionDays').inheritingPropertyCount).toBe(5);
    expect(setting(view, 'crossTenantGuestHistory').overriddenBy).toEqual([]);
  });

  // ------------------------------------------------------------------------ AC-2

  it('applies a Tenant change to inheriting Properties AND TO NO OTHERS, twice in a row', async () => {
    // Once is not enough: "override until the Tenant value changes" is the wrong model,
    // and it passes a single pass.
    for (const value of ['ar', 'en'] as const) {
      const res = await patchTenant({ locale: value });
      expect(res.status, await res.clone().text()).toBe(200);

      for (const id of inheriting) {
        const view = await propertySettings(id);
        const locale = view.settings.find((s) => s.key === 'locale')!;
        expect(locale.value, `${id} should have inherited ${value}`).toBe(value);
        expect(locale.inherited).toBe(true);
      }
      for (const id of overriding) {
        const view = await propertySettings(id);
        const locale = view.settings.find((s) => s.key === 'locale')!;
        // Still 'ar', the value it chose - even on the pass where the Tenant moved TO
        // 'ar' and then away again. Presence of the key is what stops inheritance,
        // never a comparison of values.
        expect(locale.value, `${id} must not re-inherit`).toBe('ar');
        expect(locale.inherited).toBe(false);
        // And what it is declining is visible beside it (AC-2).
        expect(locale.tenantValue).toBe(value);
      }
    }
  });

  it('shows the override from BOTH surfaces, resolved by the same rule', async () => {
    const tenantView = await tenantSettings();
    const fromTenant = setting(tenantView, 'locale').overriddenBy
      .find((o) => o.propertyId === overriding[0])!;
    const fromProperty = (await propertySettings(overriding[0]!)).settings
      .find((s) => s.key === 'locale')!;
    // The two surfaces must never disagree about what is in force - which is why they
    // render from one resolution rather than two that agree today.
    expect(fromTenant.value).toBe(fromProperty.value);
    expect(fromProperty.inherited).toBe(false);
  });

  // ------------------------------------------------------------------------ AC-3

  it('refuses a governance setting at a Property, and attributes it at the Tenant', async () => {
    for (const body of [{ crossTenantGuestHistory: true }, { guestDataRetentionDays: 30 }, { mfaRequired: true }]) {
      const res = await patchProperty(inheriting[0]!, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json() as { details?: { reason?: string } }).details?.reason)
        .toMatch(/only at Tenant level/);
    }

    // At the Tenant it works, and it is attributed with the previous value.
    expect((await patchTenant({ crossTenantGuestHistory: true, guestDataRetentionDays: 90 })).status).toBe(200);
    const c = await admin();
    try {
      const audit = await c.query<{ actor: string; details: Record<string, unknown> }>(
        `SELECT actor, details FROM control_plane.tenant_audit
          WHERE tenant_id = $1 AND action = 'tenant_settings.changed' ORDER BY id DESC LIMIT 1`,
        [tenantId]);
      const details = audit.rows[0]!.details as {
        before: Record<string, unknown>; after: Record<string, unknown>;
        governanceKeys: string[]; propertiesAffected: Record<string, number>;
      };
      expect(audit.rows[0]!.actor).toBe(staffMemberId);
      expect(details.before.crossTenantGuestHistory).toBe(false);
      expect(details.after.crossTenantGuestHistory).toBe(true);
      expect(details.before.guestDataRetentionDays).toBe(365);
      // Marked AS governance, so a later reader can find every change to guest-history
      // sharing or retention without knowing which keys those were at the time.
      expect(details.governanceKeys.sort()).toEqual(['crossTenantGuestHistory', 'guestDataRetentionDays']);
      // And how many Properties it actually reached, recorded at the moment - which
      // cannot be reconstructed later once overrides have moved.
      expect(details.propertiesAffected.crossTenantGuestHistory).toBe(5);
    } finally { await c.end(); }
  });

  it('refuses retention beyond the platform maximum a Tenant cannot raise (DG-2)', async () => {
    const view = await tenantSettings();
    const max = setting(view, 'guestDataRetentionDays').maximum!;
    const res = await patchTenant({ guestDataRetentionDays: max + 1 });
    expect(res.status).toBe(400);
    expect((await res.json() as { details?: { reason?: string } }).details?.reason)
      .toMatch(/platform maximum/);
    expect((await patchTenant({ guestDataRetentionDays: max })).status).toBe(200);
  });

  // ------------------------------------------------------------------------ AC-4

  it('shows region per Property as a summary, and offers no way to set it', async () => {
    const view = await tenantSettings();
    expect(view.regions).toHaveLength(5);
    expect(view.regions.every((r) => r.region === 'eu-west-1')).toBe(true);
    // There is no region SETTING at all - the strongest form of "not settable here".
    expect(view.settings.some((s) => s.key === 'region')).toBe(false);

    // And refused through the API, which is what the testing note asks for rather than
    // an absent control.
    expect((await patchTenant({ region: 'us-east-1' })).status).toBe(400);
    expect((await patchProperty(inheriting[0]!, { region: 'us-east-1' })).status).toBe(400);
    // The Property surface states it as immutable, as Story 1.2 established.
    expect((await propertySettings(inheriting[0]!)).regionImmutable).toBe(true);
  });

  // ------------------------------------------------------------------- the boundary

  it('lets an administrator SEE the blast radius before they may change it', async () => {
    // Gating the number behind the authority to change it would mean the only people
    // who can see the consequence are the ones who already decided they can live with it.
    const email = `viewer-${Date.now()}@hotel.test`;
    await fetch(`${h.base}/v1/staff`, {
      method: 'POST', headers: bearer(token),
      body: JSON.stringify({
        name: 'Corporate viewer', languageTag: 'en', email, roles: [{ roleKey: 'corporate_viewer' }],
      }),
    });
    const setUp = await fetch(`${h.base}/v1/auth/credential/set-up`, {
      method: 'POST', headers: json,
      body: JSON.stringify({
        token: await drainOutbox('staff_invitation', email),
        password: 'corporate-viewer-pw-1', name: 'Corporate viewer', languageTag: 'en',
      }),
    });
    const viewerToken = (await setUp.json() as { accessToken: string }).accessToken;
    const view = await tenantSettings(viewerToken);
    expect(view.settings.length).toBeGreaterThan(0);
    // Seeing it is not changing it.
    expect((await patchTenant({ locale: 'ar' }, viewerToken)).status).toBe(403);
  });

  it('refuses an unauthenticated caller on both surfaces', async () => {
    expect((await fetch(`${h.base}/v1/tenant/settings`)).status).toBe(401);
    expect((await fetch(`${h.base}/v1/properties/${inheriting[0]}/settings`)).status).toBe(401);
  });

  it('answers not_found for another Tenant\'s Property, never forbidden', async () => {
    const c = await admin();
    let elsewhere = '';
    try {
      elsewhere = (await c.query<{ id: string }>(
        'SELECT id FROM control_plane.properties WHERE tenant_id <> $1 LIMIT 1', [tenantId])).rows[0]?.id ?? '';
    } finally { await c.end(); }
    if (!elsewhere) return;
    expect((await fetch(`${h.base}/v1/properties/${elsewhere}/settings`, { headers: bearer(token) })).status)
      .toBe(404);
    expect((await patchProperty(elsewhere, { locale: 'ar' })).status).toBe(404);
  });
});
