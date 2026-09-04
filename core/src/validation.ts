/**
 * ONE ValidationError, so `instanceof` works at every boundary.
 *
 * Story 1.1 briefly had a second copy in `core/tenant`. It type-checked, and it
 * would have silently turned a 400 into a 500 the first time a tenant validation
 * failure reached a handler whose catch tests identity rather than shape.
 */
export class ValidationError extends Error {
  public readonly code = 'validation_failed' as const;
}
