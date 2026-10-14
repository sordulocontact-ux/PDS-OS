"use server";

import { z } from "zod";

import { SHEET_WORDING_INSTRUCTIONS } from "@/lib/ai/instructions/sheet-wording";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { sheetWordingSchema } from "@/lib/ai/schemas/sheet-wording";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export type WordingResult =
  { ok: true; text: string } | { ok: false; error: string };

const MAX_TEXT = 4000;

/**
 * « Proposer une formulation »: PO rewords the concept or the intention of
 * a sheet from its deliverable and the confirmed intentions. Nothing is
 * written: the person uses, edits or ignores the suggestion, then saves.
 */
export async function suggestSheetWording(
  projectId: string,
  sheetId: string,
  field: "concept" | "intention",
): Promise<WordingResult> {
  const t = fr.conceptionSheet.suggest;
  const parsed = z
    .object({
      projectId: z.uuid(),
      sheetId: z.uuid(),
      field: z.enum(["concept", "intention"]),
    })
    .safeParse({ projectId, sheetId, field });
  if (!parsed.success) return { ok: false, error: t.failed };
  await requireApproved();
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("design_sheets")
    .select(
      "title, concept, intention, design_deliverable_id, design_deliverables(strategy_deliverables(levers(label)))",
    )
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sheet) return { ok: false, error: t.failed };
  const { data: intentions } = await supabase
    .from("design_intentions")
    .select("topic, value")
    .eq("design_deliverable_id", sheet.design_deliverable_id)
    .eq("status", "confirmed");
  if (!intentions?.length) return { ok: false, error: t.noSource };

  const topics = fr.conception.topics as Record<string, string>;
  const lever =
    sheet.design_deliverables?.strategy_deliverables?.levers?.label ?? null;
  const input = [
    `<deliverable>${sheet.title}</deliverable>`,
    lever ? `<role>${lever}</role>` : "",
    "<intentions>",
    ...intentions.map((i) => `${topics[i.topic] ?? i.topic} : ${i.value}`),
    "</intentions>",
    `<field>${field}</field>`,
    `<current>${sheet[field] ?? ""}</current>`,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const { output } = await extract(
      sheetWordingSchema,
      input,
      SHEET_WORDING_INSTRUCTIONS,
    );
    const text = output.text.trim().slice(0, MAX_TEXT);
    return text ? { ok: true, text } : { ok: false, error: t.noSource };
  } catch (error) {
    console.error("suggestSheetWording:", error);
    return { ok: false, error: aiQuotaMessage(error) ?? t.failed };
  }
}
