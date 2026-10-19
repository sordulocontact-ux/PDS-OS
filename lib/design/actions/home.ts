"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, designError } from "@/lib/design/actions/shared";
import { ADDITION_ORIGINS } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// Gestures of the Conception's Accueil and of a sheet's responsible (proto
// « Projet complet » crset, depath, addliv, frset), through the viewer's
// session: the database checks the owner (start_design,
// assign_design_responsible, choose_design_start, design_deliverables RLS).
// Each says what follows (withOutcome, VISION-UX rule 7).

const t = fr.designSteps;
const invalid = (): WriteResult => ({
  ok: false,
  error: fr.conception.errors.invalid,
});

/**
 * « Désigner »: the responsible créatif (opens the Conception first: a
 * designation needs it in progress) or the responsible of one sheet.
 */
export async function designateDesignResponsible(input: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  personId: string;
  done: string;
}): Promise<WriteResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      scope: z.enum(["direction", "sheet"]),
      sheetId: z.uuid().nullable(),
      personId: z.uuid(),
      done: z.string().max(300),
    })
    .safeParse(input);
  if (!parsed.success || (input.scope === "sheet") !== Boolean(input.sheetId))
    return invalid();
  const p = parsed.data;
  await requireApproved();
  return withOutcome(p.projectId, ["marketing"], p.done, async () => {
    const supabase = await createClient();
    if (p.scope === "direction") {
      const { error } = await supabase.rpc("start_design", {
        p_project_id: p.projectId,
      });
      if (error) return designDone(p.projectId, error, "designate start");
    }
    const { error } = await supabase.rpc("assign_design_responsible", {
      p_project_id: p.projectId,
      p_scope: p.scope,
      p_sheet_id: p.scope === "sheet" ? p.sheetId : null,
      p_person_id: p.personId,
    });
    return designDone(p.projectId, error, "designateDesignResponsible");
  });
}

/**
 * « Préparer un échange créatif » / « Commencer directement », or
 * « Changer » (`null`) while no exchange was created. No reason asked.
 */
export async function chooseDesignStart(
  projectId: string,
  path: "direct" | "call" | null,
): Promise<WriteResult> {
  if (!z.uuid().safeParse(projectId).success) return invalid();
  if (path !== null && path !== "direct" && path !== "call") return invalid();
  await requireApproved();
  const write = async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("choose_design_start", {
      p_project_id: projectId,
      p_path: path,
    });
    return designDone(projectId, error, "chooseDesignStart");
  };
  return path === "direct"
    ? withOutcome(projectId, ["marketing"], t.home.start.started, write)
    : write();
}

const additionSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  format: z.string().trim().max(200),
  origin: z.enum(ADDITION_ORIGINS),
  callId: z.uuid().nullable(),
  leverId: z.uuid().nullable(),
  note: z.string().trim().min(1).max(1000),
});

/**
 * « Ajouter un livrable » (ticket § 1: « source, auteur et motif »): a need
 * arrived late, « à qualifier », never validated nor planned; its sheet is
 * created by the database at once (design_ensure_sheets).
 */
export async function addDesignDeliverable(input: {
  projectId: string;
  title: string;
  format: string;
  origin: (typeof ADDITION_ORIGINS)[number];
  callId: string | null;
  leverId: string | null;
  note: string;
}): Promise<WriteResult> {
  const parsed = additionSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const p = parsed.data;
  if (p.origin === "call" && !p.callId)
    return { ok: false, error: t.home.form.errors.call };
  if (p.origin === "strategy_decision" && !p.leverId)
    return { ok: false, error: t.home.form.errors.lever };
  const access = await requireApproved();
  if (!access.organizationId) return invalid();
  return withOutcome(
    p.projectId,
    ["marketing"],
    t.home.form.added(p.title),
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("design_deliverables").insert({
        organization_id: access.organizationId!,
        project_id: p.projectId,
        title: p.title,
        format: p.format || null,
        origin: p.origin,
        call_id: p.origin === "call" ? p.callId : null,
        lever_id: p.origin === "strategy_decision" ? p.leverId : null,
        note: p.note,
      });
      if (error) {
        console.error("addDesignDeliverable:", error.code, error.message);
        return { ok: false, error: designError(error) };
      }
      return designDone(p.projectId, null, "addDesignDeliverable");
    },
  );
}
