import "server-only";

import type {
  ConceptionData,
  ConceptionDeliverable,
} from "@/lib/design/conception";
import { isRatio, parseDuration } from "@/lib/design/sheet-fields";
import {
  sheetFields,
  storedValue,
  type FieldProposal,
  type FieldValue,
  type SheetFieldKey,
  type SheetFieldView,
} from "@/lib/design/sheet-model";
import { toProvenance } from "@/lib/design/sheet-fields";
import type { SheetFacts } from "@/lib/design/sheets";
import { fr } from "@/lib/i18n/fr";
import { addDays } from "@/lib/strategy/calendar";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/utils/day";

// What PDS OS already knows for each Fiche Livrable (proto « Projet
// complet » FICHE_DEF; ticket § 10 and 11: « préremplissage traçable »):
// every value proposed here comes from a source named in full words, or is
// computed by code and says so (« Calculé : … ») — never invented (rule 6).

const t = fr.designSteps.sheets;

/** The project's sources beyond the Conception: budget and milestones. */
export type SheetSources = {
  budget: Map<string, { cents: number; labels: string[] }>;
  milestones: Map<string, Array<{ title: string; date: string }>>;
};

export async function loadSheetSources(
  projectId: string,
): Promise<SheetSources> {
  const supabase = await createClient();
  const [lines, milestones] = await Promise.all([
    supabase
      .from("budget_lines")
      .select("deliverable_id, label, amount_cents")
      .eq("project_id", projectId)
      .not("deliverable_id", "is", null),
    supabase
      .from("milestones")
      .select("deliverable_id, title, occurs_on")
      .eq("project_id", projectId)
      .not("deliverable_id", "is", null)
      .order("occurs_on"),
  ]);
  const budget: SheetSources["budget"] = new Map();
  for (const l of lines.data ?? []) {
    const key = l.deliverable_id!;
    const sum = budget.get(key) ?? { cents: 0, labels: [] };
    sum.cents += l.amount_cents;
    sum.labels.push(l.label);
    budget.set(key, sum);
  }
  const byDeliverable: SheetSources["milestones"] = new Map();
  for (const m of milestones.data ?? []) {
    const list = byDeliverable.get(m.deliverable_id!) ?? [];
    list.push({ title: m.title, date: m.occurs_on });
    byDeliverable.set(m.deliverable_id!, list);
  }
  return { budget, milestones: byDeliverable };
}

/** The Monday after a day (« le lundi qui suit le tournage »). */
function mondayAfter(day: string): string {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, (8 - weekday) % 7 || 7);
}

const RATIO = /\b\d{1,2}(?:\.\d{1,2})?:\d{1,2}(?:\.\d{1,2})?\b/g;
// « 3 min », « 15 s » (a « 9:16 » is a ratio, never a duration).
const DURATION = /(\d{1,3}\s*min|\d{1,4}\s*s\b)/i;

/** The upstream « Production terminée » deadline, when the calendar has one. */
export function productionLimit(d: ConceptionDeliverable | undefined) {
  const step = d?.upstream.find((s) => s.key === "production");
  return step ? step.date : null;
}

/**
 * The code's proposals for one sheet: the deliverable's own intentions,
 * the direction, the format the Stratégie wrote, its due date or the
 * upstream deadline, the budget lines of the deliverable, and the dates
 * computed from the shooting and the delivery written or proposed.
 */
export function proposalsFor(
  facts: SheetFacts,
  d: ConceptionDeliverable | undefined,
  data: Pick<ConceptionData, "intentions">,
  sources: SheetSources,
): Partial<Record<SheetFieldKey, FieldProposal>> {
  const out: Partial<Record<SheetFieldKey, FieldProposal>> = {};
  const s = facts.sheet;
  const own = (topic: string) =>
    data.intentions.find(
      (i) =>
        i.status === "confirmed" &&
        i.target === "deliverable" &&
        i.deliverableId === s.design_deliverable_id &&
        i.topic === topic,
    );
  const concept = own("story") ?? own("look");
  if (concept)
    out.concept = {
      value: concept.value,
      source: t.sources.intentionsOf(d?.title ?? s.title),
    };
  const direction = (topic: string) =>
    data.intentions.find(
      (i) =>
        i.status === "confirmed" &&
        i.target === "direction" &&
        i.topic === topic,
    )?.value;
  // No story of its own: the release's direction (MKT-C2-06, inherited).
  const story = direction("story");
  if (!concept && story)
    out.concept = { value: story, source: t.sources.direction };
  const tone = [direction("tone"), direction("look")].filter(Boolean);
  if (tone.length)
    out.intention = { value: tone.join(" ; "), source: t.sources.direction };

  const format = d?.formatText ?? null;
  if (format) {
    const ratios = [...new Set(format.match(RATIO) ?? [])].filter(isRatio);
    if (ratios.length)
      out.ratios = { value: ratios, source: t.sources.strategy };
    const duration = DURATION.exec(format.replace(RATIO, ""))?.[1];
    const seconds = duration
      ? parseDuration(duration.replace(/\s+/g, " "))
      : null;
    if (seconds)
      out.duration = { value: String(seconds), source: t.sources.strategy };
    out.file_format = { value: format, source: t.sources.strategy };
  }

  const limit = productionLimit(d);
  if (d?.dueDate)
    out.delivery_date = { value: d.dueDate, source: t.sources.strategyDue };
  else if (limit)
    out.delivery_date = {
      value: limit,
      source: t.sources.upstream(formatDay(limit)),
    };

  const budget = d?.strategyDeliverableId
    ? sources.budget.get(d.strategyDeliverableId)
    : undefined;
  if (budget && budget.cents > 0)
    out.budget = {
      value: { cents: budget.cents, engaged: false },
      source: t.sources.budget(budget.labels.join(", ")),
    };

  // Computed from what the sheet says now (written, else proposed).
  const now = (key: SheetFieldKey): FieldValue =>
    storedValue(s, key) ?? out[key]?.value ?? null;
  const shoot = now("shoot_date");
  if (typeof shoot === "string")
    out.post_start = { value: mondayAfter(shoot), source: t.sources.postStart };
  const delivery = now("delivery_date");
  if (typeof delivery === "string")
    out.post_deadline = {
      value: addDays(delivery, -8),
      source: t.sources.postEnd,
    };
  return out;
}

/** « Publié le » of each element of a series: the deliverable's milestones, in order. */
export function itemDates(
  d: ConceptionDeliverable | undefined,
  sources: SheetSources,
): Array<{ date: string; source: string }> {
  const list = d?.strategyDeliverableId
    ? (sources.milestones.get(d.strategyDeliverableId) ?? [])
    : [];
  return list.map((m) => ({
    date: m.date,
    source: t.sources.milestone(m.title),
  }));
}

/** The fields of a sheet as the step shows them. */
export function fieldsFor(
  facts: SheetFacts,
  d: ConceptionDeliverable | undefined,
  data: Pick<ConceptionData, "intentions">,
  sources: SheetSources,
): SheetFieldView[] {
  return sheetFields(
    facts.sheet,
    facts.format,
    toProvenance(facts.sheet.provenance),
    proposalsFor(facts, d, data, sources),
  );
}
