"use server";

import { z } from "zod";

import { kindOfLever } from "@/lib/activations/kind-of-lever";
import { ACTIVATION_MODES, kindHasMode } from "@/lib/activations/model";
import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationJourney;
const leverScope = { projectId: z.uuid(), leverId: z.uuid() };

/**
 * « Créer l'activation » from a lever of the validated Brief de sortie
 * (proto ac0): one click by the project's owner, its kind read in the
 * lever's words, its mode chosen on the line for Influence and RP, no owner
 * nor due date yet (« Désigner », « Fixer l'échéance » follow). A content
 * waits for the deliverables of its lever (« Elle commence quand le Clip
 * officiel est livré. »): each one not delivered yet becomes a blocking
 * dependency, lifted by its delivery.
 */
export async function createFromLever(input: {
  projectId: string;
  leverId: string;
  mode: "internal" | "agency" | null;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z
    .object({ ...leverScope, mode: z.enum(ACTIVATION_MODES).nullable() })
    .safeParse(input);
  if (!v.success || !access.organizationId) return invalid();
  const { projectId, leverId, mode } = v.data;
  const supabase = await createClient();
  const { data: lever } = await supabase
    .from("levers")
    .select("id, label")
    .eq("id", leverId)
    .eq("project_id", projectId)
    .single();
  if (!lever) return invalid(fr.activations.errors.notFound);
  const kind = kindOfLever(lever.label);
  return withOutcome(
    projectId,
    ["marketing"],
    t.done.created(lever.label),
    async () => {
      const { data, error } = await supabase
        .from("marketing_activations")
        .insert({
          organization_id: access.organizationId ?? "",
          project_id: projectId,
          kind,
          mode: kindHasMode(kind) ? (mode ?? "internal") : null,
          title: lever.label.slice(0, 200),
          source_kind: "lever",
          lever_id: lever.id,
        })
        .select("id")
        .single();
      if (error || !data) return activationFailure(error ?? {});
      if (kind === "content") {
        const { data: deliverables } = await supabase
          .from("strategy_deliverables")
          .select("id")
          .eq("lever_id", lever.id);
        const ids = (deliverables ?? []).map((d) => d.id);
        const { data: delivered } = ids.length
          ? await supabase
              .from("deliverable_deliveries")
              .select("deliverable_id")
              .in("deliverable_id", ids)
              .not("delivered_at", "is", null)
          : { data: [] };
        const done = new Set((delivered ?? []).map((d) => d.deliverable_id));
        const waiting = ids.filter((id) => !done.has(id));
        if (waiting.length > 0) {
          const { error: linked } = await supabase
            .from("activation_dependencies")
            .insert(
              waiting.map((id) => ({
                activation_id: data.id,
                kind: "deliverable",
                deliverable_id: id,
                blocking: true,
                organization_id: access.organizationId ?? "",
                project_id: projectId,
              })),
            );
          if (linked)
            console.error("createFromLever dependencies:", linked.message);
        }
      }
      await supabase
        .from("activation_lever_choices")
        .delete()
        .eq("project_id", projectId)
        .eq("lever_id", lever.id);
      return activationDone(projectId);
    },
  );
}

/** « Plus tard » : the lever waits; it can be created any time. */
export async function deferLever(input: {
  projectId: string;
  leverId: string;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z.object(leverScope).safeParse(input);
  if (!v.success || !access.organizationId) return invalid();
  return withOutcome(
    v.data.projectId,
    ["marketing"],
    t.done.later,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("activation_lever_choices").insert({
        organization_id: access.organizationId ?? "",
        project_id: v.data.projectId,
        lever_id: v.data.leverId,
      });
      return error
        ? activationFailure(error)
        : activationDone(v.data.projectId);
    },
  );
}
