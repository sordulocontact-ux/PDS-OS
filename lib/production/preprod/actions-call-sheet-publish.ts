"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { effectiveLogistics } from "@/lib/production/logistics";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
import { createClient } from "@/lib/supabase/server";

import { callSheetContent } from "./call-sheet-snapshot";
import { loadContactDetails } from "./reads";
import { forbidden, invalid, preprodFailure } from "./result";

// « Diffuser la feuille » and « Lien de la feuille » (PROD-016): the
// content is composed here from the sheet — never sent by the client —
// then frozen as a version by the database.

const schema = z.object({ projectId: z.uuid(), deliverableId: z.uuid() });

export async function publishCallSheet(
  input: z.input<typeof schema>,
): Promise<PrepResult & { number?: number }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid;
  const { projectId, deliverableId } = parsed.data;
  const access = await requireApproved();
  const data = await loadProductionSheet(projectId, deliverableId, access);
  const preprod = await preprodFor(projectId, deliverableId, access);
  if (!data?.sheet || !preprod || !data.canOrganize) return forbidden;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .maybeSingle();
  const sheet = data.sheet;
  const details = await loadContactDetails([
    ...(sheet.director?.kind === "contact" ? [sheet.director.id] : []),
    ...data.needs.flatMap((n) =>
      n.assignments.flatMap((a) =>
        a.holder.kind === "contact" ? [a.holder.id] : [],
      ),
    ),
  ]);
  const content = callSheetContent({
    project: project?.title ?? "",
    deliverable: data.deliverable.title,
    manager: data.ownerName,
    shootDate: effectiveLogistics(sheet.logistics, data.heritage.fiche)
      .shootDate.value,
    logistics: sheet.logistics,
    director: sheet.director,
    needs: data.needs,
    equipment: preprod.equipment,
    callSheet: preprod.callSheet,
    details,
  });
  const { data: number, error } = await supabase.rpc(
    "publish_production_call_sheet",
    {
      p_sheet_id: sheet.id,
      p_content: content,
    },
  );
  if (error || number === null) return preprodFailure(error ?? {});
  await schedulePendingPushes();
  prepDone(projectId);
  return { ok: true, number };
}

const linkSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

export async function createCallSheetLink(
  input: z.input<typeof linkSchema>,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  await requireApproved();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_production_call_sheet_link",
    {
      p_sheet_id: parsed.data.sheetId,
    },
  );
  if (error || !data) {
    const failure = preprodFailure(error ?? {});
    return { ok: false, error: failure.ok ? "" : failure.error };
  }
  prepDone(parsed.data.projectId);
  return { ok: true, token: data };
}
