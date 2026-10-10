import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// The Fiche Livrable as the Conception handed it to Production
// (design_handoffs → design_submissions.snapshot, written by the database at
// submission). Production reads it, never copies nor edits it: it is the
// creative source of truth (ticket, « Règles métier »).
export type HandedFiche = {
  handoffId: string;
  // The validated version of the Fiche (design_submissions.number).
  version: number;
  handedAt: string;
  title: string;
  concept: string | null;
  intention: string | null;
  durationMinSeconds: number | null;
  durationMaxSeconds: number | null;
  ratios: string[];
  // null = not decided in Conception.
  subtitles: boolean | null;
  subtitleRatios: string[];
  subtitleMode: string | null;
  variants: string | null;
  notes: string | null;
  constraints: string | null;
  shootDate: string | null;
  postStart: string | null;
  postDeadline: string | null;
  deliveryDate: string | null;
  budgetCents: number | null;
  dependencies: string | null;
  productionNotes: string | null;
  responsiblePersonId: string | null;
  items: { number: number; title: string; objective: string | null }[];
  intentions: { topic: string; value: string }[];
  references: {
    title: string | null;
    url: string | null;
    fileName: string | null;
    note: string | null;
  }[];
};

type JsonObject = { [key: string]: Json | undefined };
const obj = (v: Json | undefined): JsonObject =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};
const arr = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : []);
const str = (v: Json | undefined): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const num = (v: Json | undefined): number | null =>
  typeof v === "number" ? v : null;
const strs = (v: Json | undefined): string[] =>
  arr(v).flatMap((x) => (typeof x === "string" ? [x] : []));

function ficheOf(
  handoff: { id: string; confirmed_at: string },
  submission: { number: number; snapshot: Json },
): HandedFiche {
  const snap = obj(submission.snapshot);
  const s = obj(snap.sheet);
  return {
    handoffId: handoff.id,
    version: submission.number,
    handedAt: handoff.confirmed_at,
    title: str(s.title) ?? "",
    concept: str(s.concept),
    intention: str(s.intention),
    durationMinSeconds: num(s.duration_min_seconds),
    durationMaxSeconds: num(s.duration_max_seconds),
    ratios: strs(s.ratios),
    subtitles: typeof s.subtitles === "boolean" ? s.subtitles : null,
    subtitleRatios: strs(s.subtitle_ratios),
    subtitleMode: str(s.subtitle_mode),
    variants: str(s.variants),
    notes: str(s.notes),
    constraints: str(s.constraints),
    shootDate: str(s.shoot_date),
    postStart: str(s.post_start),
    postDeadline: str(s.post_deadline),
    deliveryDate: str(s.delivery_date),
    budgetCents: num(s.budget_cents),
    dependencies: str(s.dependencies),
    productionNotes: str(s.production_notes),
    responsiblePersonId: str(snap.responsible),
    items: arr(snap.items).map((i) => {
      const o = obj(i);
      return {
        number: num(o.number) ?? 0,
        title: str(o.title) ?? "",
        objective: str(o.objective),
      };
    }),
    intentions: arr(snap.intentions).flatMap((i) => {
      const o = obj(i);
      const topic = str(o.topic);
      const value = str(o.value);
      return topic && value ? [{ topic, value }] : [];
    }),
    references: arr(snap.references).map((r) => {
      const o = obj(r);
      return {
        title: str(o.title),
        url: str(o.url),
        fileName: str(o.file_name),
        note: str(o.note),
      };
    }),
  };
}

/**
 * The Fiche Livrable handed to Production for a committed deliverable: the
 * hand-off the sheet was opened from (`handoffId`), else the latest one; and
 * the version number of a later hand-off, when there is one. Read with the
 * user's session.
 */
export async function loadHandedFiche(
  supabase: Client,
  deliverableId: string,
  handoffId: string | null,
): Promise<{ fiche: HandedFiche | null; newerVersion: number | null }> {
  const { data: designDeliverable } = await supabase
    .from("design_deliverables")
    .select("id, design_sheets(id)")
    .eq("strategy_deliverable_id", deliverableId)
    .maybeSingle();
  const linked = designDeliverable?.design_sheets;
  const sheetIds = (
    Array.isArray(linked) ? linked : linked ? [linked] : []
  ).map((s) => s.id);
  if (sheetIds.length === 0) return { fiche: null, newerVersion: null };

  const { data: handoffs, error } = await supabase
    .from("design_handoffs")
    .select("id, confirmed_at, design_submissions(number, snapshot)")
    .in("sheet_id", sheetIds)
    .order("confirmed_at", { ascending: false });
  if (error) console.error("loadHandedFiche:", error.message);
  const rows = (handoffs ?? []).flatMap((h) =>
    h.design_submissions ? [{ ...h, submission: h.design_submissions }] : [],
  );
  const chosen =
    (handoffId ? rows.find((h) => h.id === handoffId) : null) ??
    rows[0] ??
    null;
  if (!chosen) return { fiche: null, newerVersion: null };
  const latest = rows[0];
  return {
    fiche: ficheOf(chosen, chosen.submission),
    newerVersion:
      handoffId && latest && latest.id !== chosen.id
        ? latest.submission.number
        : null,
  };
}
