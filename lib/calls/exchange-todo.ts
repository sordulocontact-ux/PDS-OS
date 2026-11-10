import { calls } from "@/lib/i18n/fr/calls";
import { formatShortDay } from "@/lib/utils/day";

/**
 * A module's exchange (Cadrage, Stratégie, Conception) as its journey reads
 * it: `held` once its report exists, `failed` when its transcription or its
 * report failed (calls.status), so the owner relaunches it instead of being
 * asked to hold an exchange that already took place.
 */
export type ExchangeCall = {
  occurredAt: string;
  held: boolean;
  failed: boolean;
};

const dayOf = (call: ExchangeCall) =>
  formatShortDay(call.occurredAt, { bare: true });

/** The exchange's processing failed: the owner relaunches its report. */
export const relaunchTodo = (call: ExchangeCall) =>
  calls.process.relaunchOn(dayOf(call));

/** The owner's gesture on the exchange: hold it, or relaunch its report. */
export function exchangeTodo(
  call: ExchangeCall,
  holdOn: (day: string) => string,
): string {
  return call.failed ? relaunchTodo(call) : holdOn(dayOf(call));
}
