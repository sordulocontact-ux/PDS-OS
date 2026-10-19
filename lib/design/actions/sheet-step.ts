"use server";

import { z } from "zod";

import { designDone } from "@/lib/design/actions/shared";
import { isSheetFieldKey, missingFields } from "@/lib/design/sheet-model";
import {
  patchOf,
  provenanceWith,
  refusalOf,
  sheetContext,
} from "@/lib/design/sheet-patch";
import { fieldsFor, itemDates } from "@/lib/design/sheet-proposals";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Gestures on a Fiche Livrable in the step (proto « Projet complet »
// ffsave, fssave, fsubmit, ftransfer, fnewv), through the viewer's session:
// the database lets only the sheet's responsible (or the owner) write while
// nothing waits for a decision (design_sheet_can_edit), only the owner
// transfer (handoff_design_sheet).

const t = fr.designSteps.sheets;
const invalid = (): WriteResult => ({
  ok: false,
  error: fr.conception.errors.invalid,
});
const ids = z.object({ projectId: z.uuid(), sheetId: z.uuid() });
const money = z.object({
  cents: z.number().int().min(0),
  engaged: z.boolean(),
});
const fieldValue = z.union([
  z.string().max(4000),
  z.array(z.string().max(20)).max(10),
  money,
  z.null(),
]);

/** « Enregistrer » of one field: checked, then « Modifié par … ». */
export async function saveSheetField(input: {
  projectId: string;
  sheetId: string;
  key: string;
  value: unknown;
}): Promise<WriteResult> {
  const parsed = ids.safeParse(input);
  const value = fieldValue.safeParse(input.value);
  if (!parsed.success || !value.success || !isSheetFieldKey(input.key))
    return invalid();
  const ctx = await sheetContext(input.projectId, input.sheetId);
  if (!ctx) return invalid();
  const key = input.key;
  const patch = patchOf(key, value.data, ctx.facts);
  if (!patch) return invalid();
  const field = fieldsFor(
    ctx.facts,
    ctx.deliverable,
    ctx.data,
    ctx.sources,
  ).find((f) => f.key === key);
  const blank =
    value.data === null ||
    (typeof value.data === "string" && !value.data.trim()) ||
    (Array.isArray(value.data) && value.data.length === 0);
  if (field?.required && blank) return { ok: false, error: t.required };
  const refusal = refusalOf(ctx, patch);
  if (refusal) return { ok: false, error: refusal };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheets")
    .update({
      ...patch,
      provenance: provenanceWith(ctx.facts, [
        { key, source: "manual", detail: t.changedBy(ctx.viewer) },
      ]),
      updated_by: ctx.access.personId,
    })
    .eq("id", input.sheetId)
    .select("id");
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conceptionSheet.frozen };
  return designDone(input.projectId, error, "saveSheetField");
}

/** « Enregistrer » of an element of a series: its objective and date. */
export async function saveSheetItem(input: {
  projectId: string;
  itemId: string;
  objective: string;
  publishDate: string;
}): Promise<WriteResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      itemId: z.uuid(),
      objective: z.string().trim().max(2000),
      publishDate: z.union([z.literal(""), z.iso.date()]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheet_items")
    .update({
      objective: parsed.data.objective || null,
      publish_date: parsed.data.publishDate || null,
    })
    .eq("id", parsed.data.itemId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conceptionSheet.frozen };
  return designDone(input.projectId, error, "saveSheetItem");
}

/**
 * « Soumettre à … »: what the sheet shows is what goes — every proposed
 * value is written with its source, then the version is submitted.
 */
export async function submitSheetStep(input: {
  projectId: string;
  sheetId: string;
}): Promise<WriteResult> {
  if (!ids.safeParse(input).success) return invalid();
  const ctx = await sheetContext(input.projectId, input.sheetId);
  if (!ctx) return invalid();
  const fields = fieldsFor(ctx.facts, ctx.deliverable, ctx.data, ctx.sources);
  const missing = missingFields(fields);
  if (missing.length)
    return { ok: false, error: t.missingError(missing.join(", ")) };
  return withOutcome(
    input.projectId,
    ["marketing"],
    t.submittedDone(ctx.facts.sheet.title),
    async () => {
      const supabase = await createClient();
      const proposed = fields.filter((f) => !f.stored && f.value !== null);
      if (proposed.length) {
        const patch = Object.assign(
          {},
          ...proposed.map((f) => patchOf(f.key, f.value, ctx.facts) ?? {}),
        );
        const { error } = await supabase
          .from("design_sheets")
          .update({
            ...patch,
            provenance: provenanceWith(
              ctx.facts,
              proposed.map((f) => ({
                key: f.key,
                source: f.key === "concept" ? "intention" : "strategy",
                detail: f.proposal?.source ?? "",
              })),
            ),
          })
          .eq("id", input.sheetId);
        if (error) return designDone(input.projectId, error, "submit fill");
      }
      const dates = itemDates(ctx.deliverable, ctx.sources);
      for (const item of ctx.facts.items) {
        const date = dates[item.number - 1];
        if (item.publish_date || !date) continue;
        await supabase
          .from("design_sheet_items")
          .update({ publish_date: date.date })
          .eq("id", item.id);
      }
      const { error } = await supabase.rpc("submit_design_sheet", {
        p_sheet_id: input.sheetId,
        p_message: undefined,
        p_due_on: undefined,
      });
      return designDone(input.projectId, error, "submitSheetStep");
    },
  );
}

/** « Transférer en Production »: opens the Production of that deliverable. */
export async function transferSheet(input: {
  projectId: string;
  sheetId: string;
  title: string;
}): Promise<WriteResult> {
  if (!ids.safeParse(input).success) return invalid();
  return withOutcome(
    input.projectId,
    ["marketing"],
    t.transferredDone(input.title),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("handoff_design_sheet", {
        p_sheet_id: input.sheetId,
      });
      return designDone(input.projectId, error, "transferSheet");
    },
  );
}

/** « Modifier (nouvelle version) »: the sheet is a Brouillon again. */
export async function openSheetVersion(input: {
  projectId: string;
  sheetId: string;
}): Promise<WriteResult> {
  if (!ids.safeParse(input).success) return invalid();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheets")
    .update({ new_version_at: new Date().toISOString() })
    .eq("id", input.sheetId)
    .select("id");
  if (!error && (data ?? []).length === 0)
    return { ok: false, error: fr.conceptionSheet.frozen };
  return designDone(input.projectId, error, "openSheetVersion");
}
