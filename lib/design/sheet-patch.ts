import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import { loadConception } from "@/lib/design/conception";
import {
  isRatio,
  parseDuration,
  toProvenance,
} from "@/lib/design/sheet-fields";
import {
  FIELD_TYPE,
  SUBTITLE_CHOICES,
  type FieldValue,
  type Money,
  type SheetFieldKey,
  type SubtitleChoice,
} from "@/lib/design/sheet-model";
import {
  fieldsFor,
  loadSheetSources,
  productionLimit,
} from "@/lib/design/sheet-proposals";
import { loadFacts, type SheetFacts } from "@/lib/design/sheets";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { personName } from "@/lib/projects/types";
import type { Database } from "@/lib/supabase/database.types";
import { formatDay } from "@/lib/utils/day";

// Turning a field of a Fiche Livrable into its columns, and the code's
// checks before anything is written (proto ffsave): required, dates that
// follow each other, delivery before the upstream deadline.

type Update = Database["public"]["Tables"]["design_sheets"]["Update"];
const t = fr.designSteps.sheets;

/** Everything one sheet's writes need, read with the viewer's session. */
export async function sheetContext(projectId: string, sheetId: string) {
  const [access, project] = await Promise.all([
    requireApproved(),
    getProject(projectId),
  ]);
  if (!project) return null;
  const [data, facts, sources] = await Promise.all([
    loadConception(project, access),
    loadFacts(projectId, sheetId),
    loadSheetSources(projectId),
  ]);
  const sheet = facts[0];
  if (!data || !sheet) return null;
  const deliverable = data.deliverables.find(
    (d) => d.id === sheet.sheet.design_deliverable_id,
  );
  const viewer =
    personName(access.firstName ?? "", access.lastName ?? "") || "—";
  return { access, data, facts: sheet, sources, deliverable, viewer };
}
export type SheetContext = NonNullable<
  Awaited<ReturnType<typeof sheetContext>>
>;

/** The columns of a field's value. Null: the value cannot be read. */
export function patchOf(
  key: SheetFieldKey,
  value: FieldValue,
  facts: SheetFacts,
): Update | null {
  const s = facts.sheet;
  const text = typeof value === "string" ? value.trim() : "";
  switch (FIELD_TYPE[key]) {
    case "duration": {
      if (!text)
        return { duration_min_seconds: null, duration_max_seconds: null };
      const seconds = parseDuration(text) ?? (Number(text) || null);
      return seconds
        ? { duration_min_seconds: seconds, duration_max_seconds: seconds }
        : null;
    }
    case "ratios": {
      const list = Array.isArray(value) ? value.filter(isRatio) : [];
      return {
        ratios: list,
        ...(s.subtitles ? { subtitle_ratios: list } : {}),
      };
    }
    case "subs": {
      if (!text)
        return { subtitles: null, subtitle_mode: null, subtitle_ratios: [] };
      if (!SUBTITLE_CHOICES.includes(text as SubtitleChoice)) return null;
      return text === "none"
        ? { subtitles: false, subtitle_mode: null, subtitle_ratios: [] }
        : {
            subtitles: true,
            subtitle_mode: text as "burned" | "file" | "both",
            subtitle_ratios: s.ratios,
          };
    }
    case "money": {
      if (value === null) return { budget_cents: null };
      const m = value as Money;
      if (!Number.isFinite(m.cents) || m.cents < 0) return null;
      return {
        budget_cents: Math.round(m.cents),
        budget_state: m.engaged ? "committed" : "not_committed",
      };
    }
    case "date":
      if (text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
      return { [key]: text || null };
    default:
      if (key === "notes") return { notes: text || null, constraints: null };
      return { [key]: text || null };
  }
}

const DATES: SheetFieldKey[] = [
  "shoot_date",
  "post_start",
  "post_deadline",
  "delivery_date",
];

/**
 * The code's refusal of a sheet as it would be after `patch`, or null:
 * dates out of order (« Les dates doivent se suivre : … »), delivery after
 * the upstream deadline.
 */
export function refusalOf(ctx: SheetContext, patch: Update): string | null {
  const facts = {
    ...ctx.facts,
    sheet: { ...ctx.facts.sheet, ...patch },
  } as SheetFacts;
  const fields = fieldsFor(facts, ctx.deliverable, ctx.data, ctx.sources);
  const dates = DATES.flatMap((key) => {
    const f = fields.find((x) => x.key === key);
    return f && typeof f.value === "string"
      ? [{ label: f.label.replace(/ le$/, "").toLowerCase(), value: f.value }]
      : [];
  });
  if (dates.some((d, i) => i > 0 && d.value < dates[i - 1].value))
    return t.datesOrder(dates.map((d) => d.label).join(", "));
  const limit = productionLimit(ctx.deliverable);
  const delivery = fields.find((f) => f.key === "delivery_date")?.value;
  if (limit && typeof delivery === "string" && delivery > limit)
    return t.deliveryLimit(t.limit(formatDay(limit)));
  return null;
}

/** The provenance after `keys` were written, with their source in words. */
export function provenanceWith(
  facts: SheetFacts,
  entries: Array<{
    key: SheetFieldKey;
    source: "manual" | "strategy" | "intention";
    detail: string;
  }>,
) {
  const provenance = toProvenance(facts.sheet.provenance);
  for (const e of entries)
    provenance[e.key] = { source: e.source, detail: e.detail };
  return provenance;
}
