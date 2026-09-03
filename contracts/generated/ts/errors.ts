/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: contracts/ (the schema of record). Regenerate with `npm run codegen`.
 * The codegen-drift gate fails the build if this file differs from its source.
 */
export const ERROR_CODES = ["unauthenticated","forbidden","not_found","validation_failed","conflict","upstream_unavailable","internal"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
