// The agenda of an exchange (ticket § 3, "Préparer un échange"): one point
// per dimension the Brief Mix/Master does not settle yet, written by code —
// the same idea as the first framing call's fixed agenda, no model involved.
// Pure.

import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import { fr } from "@/lib/i18n/fr";
import {
  DEFAULT_DELIVERABLES,
  type MasterBrief,
} from "@/lib/master-workflow/brief-types";

export function masterExchangeAgenda(
  brief: MasterBrief,
  // A title whose source is not confirmed yet (or has no audio at all).
  sourcesOpen: boolean,
): AgendaItem[] {
  const t = fr.masterWorkflow.brief.agenda;
  const items: AgendaItem[] = [];
  if (
    !brief.mixContactId ||
    (!brief.masteringSameEngineer && !brief.masteringContactId)
  )
    items.push({ topic: t.engineers, minutes: 10 });
  if (
    brief.mixRateCents === null ||
    brief.masteringRateCents === null ||
    brief.revisions === null
  )
    items.push({ topic: t.rates, minutes: 10 });
  if (!brief.references && !brief.direction && !brief.constraints)
    items.push({ topic: t.direction, minutes: 15 });
  const untouched =
    brief.deliverables.length === DEFAULT_DELIVERABLES.length &&
    DEFAULT_DELIVERABLES.every((key) => brief.deliverables.includes(key));
  if (untouched) items.push({ topic: t.deliverables, minutes: 5 });
  if (!brief.dates.masterFinalDue)
    items.push({ topic: t.calendar, minutes: 10 });
  if (sourcesOpen) items.push({ topic: t.sources, minutes: 5 });
  // Everything is noted: the exchange confirms it.
  return items.length > 0 ? items : [{ topic: t.confirm, minutes: 10 }];
}
