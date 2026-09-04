/**
 * Secrets and connection details come from the platform, never from a repository
 * file and never from a device (Consistency Conventions). Local development reads
 * the same variables so there is one code path.
 *
 * Note the deliberate split: the APPLICATION connects as a non-superuser role with
 * row-level security in force; only migrations and projection rebuild connect as an
 * admin. That is what makes AC-4's isolation a property of the database and not of
 * every query author's memory.
 */
const need = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`missing required environment variable ${name}`);
  return v;
};

export const appConnectionString = (): string =>
  need('DATABASE_URL_APP');

export const adminConnectionString = (): string =>
  need('DATABASE_URL_ADMIN');

/**
 * The Jazzware-internal surface connects as its OWN role, `jt_control`, which is
 * granted nothing in the `cell` schema (migration 004). That is Story 11.1 AC-1 -
 * an operator session grants no read of tenant data - as a database fact rather
 * than a permission check somebody could later widen.
 */
export const controlConnectionString = (): string =>
  need('DATABASE_URL_CONTROL');

export const cellName = (): string => need('CELL_NAME', 'local-dev');
