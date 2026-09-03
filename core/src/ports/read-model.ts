import type { Scope } from '../tenancy';

/** A projection read. AD-3: the scope is not optional and not a filter the caller may omit. */
export interface ReadModel<T> {
  byId(scope: Scope, id: string): Promise<T | undefined>;
  list(scope: Scope, query?: { q?: string }): Promise<T[]>;
}
