/**
 * AD-8: notification INTENTS live in the domain; delivery is an adapter concern,
 * and the suppression contract is evaluated once, in the domain (Story 5.3).
 */
export interface NotificationIntent {
  readonly kind: string;
  readonly roles: readonly string[];
}
export interface NotificationPort {
  deliver(intent: NotificationIntent): Promise<void>;
}
