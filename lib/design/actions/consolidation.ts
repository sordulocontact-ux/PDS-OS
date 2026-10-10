"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { DESIGN_TOPICS, DIRECTION_KEY } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Consolidation of the intentions (ticket § 4): merging or splitting PO's
// proposals keeps their source (merge_design_intentions,
// split_design_intention); the owner alone confirms the consolidated
// intentions of a target (confirm_design_intentions).

const id = z.uuid();
// A target key: « direction », or a deliverable of the Conception.
const targetKey = z.union([z.literal(DIRECTION_KEY), z.uuid()]);
const text = z.string().trim().min(1).max(2000);
const topic = z.enum(DESIGN_TOPICS);

function invalid(): DesignResult {
  return { ok: false, error: fr.conception.errors.invalid };
}

const toTarget = (key: string) =>
  key === DIRECTION_KEY
    ? { target: "direction", deliverableId: null }
    : { target: "deliverable", deliverableId: key };

/** Several proposals become one, reworded by the person. */
export async function mergeDesignIntentions(
  projectId: string,
  intentionIds: string[],
  value: string,
  topicKey: string,
  target: string,
): Promise<DesignResult> {
  const ids = z.array(id).min(2).max(20).safeParse(intentionIds);
  const v = text.safeParse(value);
  const tp = topic.safeParse(topicKey);
  const tg = targetKey.safeParse(target);
  if (!id.safeParse(projectId).success || !ids.success || !v.success)
    return invalid();
  if (!tp.success || !tg.success) return invalid();
  await requireApproved();
  const place = toTarget(tg.data);
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_design_intentions", {
    p_ids: [...new Set(ids.data)],
    p_value: v.data,
    p_target: place.target,
    p_deliverable_id: place.deliverableId,
    p_topic: tp.data,
  });
  return designDone(projectId, error, "mergeDesignIntentions");
}

const partSchema = z.object({ target: targetKey, topic, value: text });

/** One proposal becomes several, each with its target and topic. */
export async function splitDesignIntention(
  projectId: string,
  intentionId: string,
  parts: Array<{ target: string; topic: string; value: string }>,
): Promise<DesignResult> {
  const parsed = z.array(partSchema).min(2).max(10).safeParse(parts);
  if (
    !id.safeParse(projectId).success ||
    !id.safeParse(intentionId).success ||
    !parsed.success
  )
    return { ok: false, error: fr.conceptionIntents.split.minParts };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("split_design_intention", {
    p_id: intentionId,
    p_parts: parsed.data.map((part) => {
      const place = toTarget(part.target);
      return {
        target: place.target,
        deliverable_id: place.deliverableId ?? "",
        topic: part.topic,
        value: part.value,
      };
    }),
  });
  return designDone(projectId, error, "splitDesignIntention");
}

/** « Confirmer les intentions » of a target: the owner only. */
export async function confirmDesignIntentions(
  projectId: string,
  target: string,
): Promise<DesignResult> {
  const tg = targetKey.safeParse(target);
  if (!id.safeParse(projectId).success || !tg.success) return invalid();
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_design_intentions", {
    p_project_id: projectId,
    p_deliverable_id: toTarget(tg.data).deliverableId,
  });
  return designDone(projectId, error, "confirmDesignIntentions");
}
