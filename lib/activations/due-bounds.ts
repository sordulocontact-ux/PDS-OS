// The bounds of an activation's deadline (recette of 23/10, MKT-ACT-001;
// SQL marketing_activations_check, 20261026400101): from today (Paris) to
// the end of the campaign, the release + 28 days (`marketing_campaign_end`,
// the period of the first-month KPIs). Said to the person before the
// database refuses it. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";

const e = fr.activationJourney.errors;

// `max` null: the release date is not known yet.
export type DueBounds = { min: string; max: string | null };

/** Why a deadline is out of bounds, or null. */
export function dueError(value: string, bounds: DueBounds): string | null {
  if (value < bounds.min) return e.dueInPast;
  if (bounds.max !== null && value > bounds.max)
    return e.dueAfterCampaign(formatDay(bounds.max));
  return null;
}
