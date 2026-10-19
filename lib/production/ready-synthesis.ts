import "server-only";

import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { effectiveLogistics } from "@/lib/production/logistics";
import { placeFit } from "@/lib/production/place";
import type { PreprodData } from "@/lib/production/preprod/types";
import type { ProductionQuote } from "@/lib/production/quotes/queries";
import type { ReadyRow } from "@/lib/production/ready-rows";
import type { ProductionSheetData } from "@/lib/production/sheet";
import type { StepTools } from "@/lib/step-tools/queries";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const t = fr.productionReady;

/**
 * The synthesis before the shoot (proto synthesis), computed by code from
 * what is validated — never from what is said: the place and its fit with
 * the quote, the date, the company's checklist, the quote, the proposal,
 * the open blockers and the informations still to confirm.
 */
export function readySynthesis({
  data,
  preprod,
  quotes,
  place,
  tools,
}: {
  data: ProductionSheetData;
  preprod: PreprodData;
  quotes: ProductionQuote[];
  place: { name: string; priceCents: number | null } | null;
  tools: StepTools;
}): ReadyRow[] {
  const sheet = data.sheet;
  if (!sheet) return [];
  const v = t.values;
  const owner = data.ownerName ?? "—";
  const active = quotes.find((q) => q.status === "approved") ?? null;
  const fit = place
    ? placeFit(
        place.priceCents,
        1,
        active && {
          number: active.number,
          locBudgetCents: active.locBudgetCents,
        },
      )
    : null;
  const shoot = effectiveLogistics(sheet.logistics, data.heritage.fiche)
    .shootDate.value;
  const task = (key: string, label: string, rowKey: string): ReadyRow => {
    const a = preprod.actions.find((x) => x.templateKey === `checklist_${key}`);
    const done = a && (a.doneAt !== null || a.taskDone === true);
    return {
      key: rowKey,
      label,
      value: !a
        ? v.noTask
        : done
          ? v.done(a.doneAt ? formatShortInstant(a.doneAt) : "—")
          : v.notYet(a.holder?.name ?? "—"),
      ok: Boolean(done),
    };
  };
  const mine = (x: { module: string; subjectId: string | null }) =>
    x.module === "production" && x.subjectId === data.deliverable.id;
  const blockers = tools.blockers.filter((b) => !b.lifted && mine(b));
  const notes = tools.notes.filter(
    (n) =>
      mine(n) &&
      !n.discarded &&
      !n.group &&
      (n.status === "to_confirm" || n.status === "pending_decision"),
  );
  const revising =
    Boolean(sheet.quoteRevision) || (quotes[0] && quotes[0] !== active);
  const d = sheet.organization.direction.status;
  return [
    {
      key: "place",
      label: t.rows.place,
      value: place
        ? [place.name, fit?.text].filter(Boolean).join(" · ")
        : v.noPlace,
      ok: Boolean(place) && !(fit && !fit.ok),
    },
    {
      key: "date",
      label: t.rows.date,
      value: shoot ? v.shootOn(formatDay(shoot)) : v.noDate(owner),
      ok: Boolean(shoot),
    },
    task("crew", t.rows.crew, "crew"),
    task("schedule", t.rows.plan, "plan"),
    task("gear", t.rows.gear, "gear"),
    {
      key: "quote",
      label: t.rows.quote,
      value: active
        ? v.quote(active.number, formatEuros(active.amountCents)) +
          (revising ? v.revising : "")
        : v.noQuote,
      ok: Boolean(active) && !revising,
    },
    {
      key: "direction",
      label: t.rows.direction,
      value:
        d === "approved"
          ? sheet.directionRevision
            ? v.directionRevising
            : v.direction
          : v.noDirection,
      ok: d === "approved" && !sheet.directionRevision,
    },
    {
      key: "blockers",
      label: t.rows.blockers,
      value: blockers.length
        ? blockers.map((b) => b.description).join(" · ")
        : v.none,
      ok: blockers.length === 0,
    },
    {
      key: "notes",
      label: t.rows.notes,
      value: notes.length ? v.notes(notes.length, owner) : v.noneF,
      ok: notes.length === 0,
    },
  ];
}
