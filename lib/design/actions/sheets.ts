"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  designDone,
  designError,
  type DesignResult,
} from "@/lib/design/actions/shared";
import { toProvenance, type SheetProvenance } from "@/lib/design/sheet-fields";
import { changedFields, toSheetPatch } from "@/lib/design/sheet-form";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Every write goes through the user's session: the owner creates the sheets
// (design_sheets_insert_owner); the owner or the sheet's responsible edits
// them while nothing waits for a decision (design_sheet_can_edit).

const t = fr.conceptionSheet;
const fail = (error: string): DesignResult => ({ ok: false, error });

/**
 * « Créer la fiche »: prefilled from the validated Stratégie (title, due
 * date) and the confirmed intentions, each value with its provenance. A
 * series gets `count` numbered items, as many as decided, never fixed.
 */
export async function createDesignSheet(
  projectId: string,
  deliverableId: string,
  kind: "single" | "series",
  count: number,
): Promise<DesignResult & { sheetId?: string }> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      deliverableId: z.uuid(),
      kind: z.enum(["single", "series"]),
      count: z.number().int().min(1).max(200),
    })
    .safeParse({ projectId, deliverableId, kind, count });
  if (!parsed.success)
    return fail(kind === "series" ? t.errors.count : t.errors.invalid);
  const access = await requireApproved();
  if (!access.organizationId) return fail(fr.conception.errors.generic);
  const supabase = await createClient();

  const [{ data: deliverable }, { data: intentions }, { data: direction }] =
    await Promise.all([
      supabase
        .from("design_deliverables")
        .select("id, title, strategy_deliverables(title, due_date)")
        .eq("id", deliverableId)
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("design_intentions")
        .select("topic, value")
        .eq("design_deliverable_id", deliverableId)
        .eq("status", "confirmed")
        .order("topic"),
      // MKT-C2-06: the release's direction as confirmed when the sheet is
      // created, inherited where the deliverable says nothing of its own.
      supabase
        .from("design_intentions")
        .select("topic, value")
        .eq("project_id", projectId)
        .eq("target", "direction")
        .eq("status", "confirmed")
        .order("topic"),
    ]);
  if (!deliverable) return fail(fr.conception.errors.generic);
  const committed = deliverable.strategy_deliverables;
  const title = committed?.title ?? deliverable.title ?? "";
  const topics = fr.conception.topics as Record<string, string>;
  const own = intentions ?? [];
  const intention = [
    ...own.map((i) => `${topics[i.topic] ?? i.topic} : ${i.value}`),
    ...(direction ?? [])
      .filter((d) => !own.some((i) => i.topic === d.topic))
      .map((d) => t.create.inherited(topics[d.topic] ?? d.topic, d.value)),
  ].join("\n");
  const provenance: SheetProvenance = {
    title: { source: committed ? "strategy" : "manual" },
    ...(intention ? { intention: { source: "intention" as const } } : {}),
    ...(committed?.due_date
      ? { delivery_date: { source: "strategy" as const } }
      : {}),
  };

  const { data: sheet, error } = await supabase
    .from("design_sheets")
    .insert({
      organization_id: access.organizationId,
      project_id: projectId,
      design_deliverable_id: deliverableId,
      kind,
      title,
      intention: intention || null,
      delivery_date: committed?.due_date ?? null,
      provenance,
    })
    .select("id")
    .single();
  if (error || !sheet) {
    if (error?.code === "23505") return fail(t.errors.exists);
    return designDone(projectId, error, "createDesignSheet");
  }
  if (kind === "series") {
    const { error: itemsError } = await supabase
      .from("design_sheet_items")
      .insert(
        Array.from({ length: count }, (_, i) => ({
          organization_id: access.organizationId!,
          project_id: projectId,
          sheet_id: sheet.id,
          number: i + 1,
          title: t.create.itemTitle(title, i + 1),
        })),
      );
    if (itemsError) {
      // Never half a series: the sheet goes with its items.
      await supabase.from("design_sheets").delete().eq("id", sheet.id);
      return designDone(projectId, itemsError, "createDesignSheet items");
    }
  }
  const done = designDone(projectId, null, "createDesignSheet");
  return { ...done, sheetId: sheet.id };
}

/**
 * « Enregistrer la fiche »: every value changed gets its provenance — the
 * person's, or a suggestion of PO the person accepted (`fromSuggestion`).
 */
export async function updateDesignSheet(
  projectId: string,
  sheetId: string,
  values: unknown,
  fromSuggestion: string[],
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(sheetId).success
  )
    return fail(t.errors.invalid);
  const result = toSheetPatch(values);
  if (!result.ok) return fail(t.errors[result.error]);
  const access = await requireApproved();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("design_sheets")
    .select("*")
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!current) return fail(fr.conception.errors.generic);

  const changed = changedFields(current, result.patch);
  if (changed.length === 0)
    return designDone(projectId, null, "updateDesignSheet");
  const provenance = toProvenance(current.provenance);
  for (const field of changed)
    provenance[field] = {
      source: fromSuggestion.includes(field) ? "suggestion" : "manual",
    };

  const { data, error } = await supabase
    .from("design_sheets")
    .update({ ...result.patch, provenance, updated_by: access.personId })
    .eq("id", sheetId)
    .select("id");
  // RLS hides what it refuses: nothing updated means frozen or not allowed.
  if (!error && (data ?? []).length === 0) return fail(t.frozen);
  if (error) return fail(designError(error));
  return designDone(projectId, null, "updateDesignSheet");
}
