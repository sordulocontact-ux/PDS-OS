"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { STRATEGY_ANSWER_FIELDS } from "@/lib/strategy/dimension-items";
import { dbWrite } from "@/lib/strategy/write";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Confirmer » / « Modifier » / « Écarter » on a line of « Les 8
// dimensions » (proto itm / itmsave), whatever it is: an answer field, a
// lever, a proposal of PO, a row entered before, a public. Owner only,
// while the strategy is open: the database decides (strategy_is_editable).

const t = fr.strategyDimensions;

const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("field"), key: z.enum(STRATEGY_ANSWER_FIELDS) }),
  z.object({ type: z.literal("lever"), id: z.uuid() }),
  z.object({ type: z.literal("proposal"), id: z.uuid() }),
  z.object({
    type: z.literal("item"),
    kind: z.enum(["deliverable", "milestone", "objective"]),
    id: z.uuid(),
  }),
  z.object({ type: z.literal("audience"), id: z.uuid() }),
]);
export type LineTarget = z.input<typeof target>;

const words = z.string().trim().min(1).max(300);

// RLS hides a refused update: no row back means the strategy is closed.
const refused = (
  error: { code?: string; message?: string } | null,
  rows: unknown[] | null,
) => error ?? (rows && rows.length > 0 ? null : { code: "42501" });

/** Appends a field's decision, keeping where PO heard it (history kept). */
async function decideField(
  projectId: string,
  key: (typeof STRATEGY_ANSWER_FIELDS)[number],
  keep: boolean,
  text: string | null,
) {
  const access = await requireApproved();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("field_values")
    .select(
      "value, status, source_type, source_report_item_id, source_quote, source_start_seconds",
    )
    .eq("project_id", projectId)
    .eq("deliverable", "strategy")
    .eq("field_key", key)
    .order("created_at", { ascending: false })
    .limit(20);
  const latest = rows?.[0];
  if (!latest || !access.organizationId) return { message: "item_not_found" };
  const sourced = rows?.find((r) => r.source_type === "call") ?? null;
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable: "strategy",
    field_key: key,
    value: text ?? latest.value,
    status: keep ? "confirmed" : "rejected",
    source_type: sourced ? "call" : "manual",
    source_report_item_id: sourced?.source_report_item_id ?? null,
    source_quote: sourced?.source_quote ?? null,
    source_start_seconds: sourced?.source_start_seconds ?? null,
  });
  return error;
}

async function write(
  projectId: string,
  line: z.output<typeof target>,
  keep: boolean,
  text: string | null,
): Promise<{ code?: string; message?: string } | null> {
  const supabase = await createClient();
  switch (line.type) {
    case "field":
      return decideField(projectId, line.key, keep, text);
    case "lever": {
      const { data, error } = await supabase
        .from("levers")
        .update(
          keep
            ? {
                review_status: "confirmed",
                state: "selected",
                ...(text ? { label: text } : {}),
              }
            : { review_status: "rejected", state: "rejected" },
        )
        .eq("id", line.id)
        .eq("project_id", projectId)
        .select("id");
      return refused(error, data);
    }
    case "proposal": {
      const { error } = await supabase.rpc("decide_strategy_proposal", {
        p_proposal_id: line.id,
        p_keep: keep,
        ...(text ? { p_text: text } : {}),
      });
      return error;
    }
    case "item": {
      if (!keep) {
        const { error } = await supabase.rpc("discard_strategy_item", {
          p_kind: line.kind,
          p_item_id: line.id,
        });
        return error;
      }
      if (!text) return null;
      const table =
        line.kind === "deliverable"
          ? supabase.from("strategy_deliverables").update({ title: text })
          : line.kind === "milestone"
            ? supabase.from("milestones").update({ title: text })
            : supabase
                .from("strategy_objectives")
                .update({ label: text.slice(0, 200) });
      const { data, error } = await table
        .eq("id", line.id)
        .eq("project_id", projectId)
        .select("id");
      return refused(error, data);
    }
    case "audience": {
      const query = keep
        ? text
          ? supabase
              .from("strategy_audiences")
              .update({ segment: text.slice(0, 120) })
          : null
        : supabase.from("strategy_audiences").delete();
      if (!query) return null;
      const { data, error } = await query
        .eq("id", line.id)
        .eq("project_id", projectId)
        .select("id");
      return refused(error, data);
    }
  }
}

/**
 * Decides a line: `keep` with its words, reworded (`text`, saved as kept)
 * or not; set aside otherwise (it stays visible, struck through). Says what
 * follows (the banner) when the last dimension completes.
 */
export async function decideStrategyLine(
  projectId: string,
  line: LineTarget,
  keep: boolean,
  text?: string,
): Promise<WriteResult> {
  const p = target.safeParse(line);
  const w = text === undefined ? null : words.safeParse(text);
  if (!z.uuid().safeParse(projectId).success || !p.success || (w && !w.success))
    return { ok: false, error: fr.framing.errors.invalid_input };
  const done = !keep ? t.done.discarded : text ? t.done.saved : t.done.kept;
  return withOutcome(projectId, ["marketing"], done, async () => {
    const error = await write(projectId, p.data, keep, w?.data ?? null);
    if (!error) revalidatePath(routes.project(projectId), "layout");
    return dbWrite(error);
  });
}
