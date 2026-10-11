"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import {
  isIntentionChoice,
  MAX_OTHER_CHARS,
} from "@/lib/design/intention-choices";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/ui/choice-value";
import { createClient } from "@/lib/supabase/server";

// Every write goes through the user's session: the database lets the owner
// and the creative team write, while the Conception is in progress
// (design_can_write), and keeps the previous answer as history.

const value = z.string().trim().min(1).max(2000);
const invalid: DesignResult = {
  ok: false,
  error: fr.conceptionWork.errors.invalid,
};

/**
 * A person's answer to one question: the confirmed intention of a topic,
 * with the choices checked to write it (shown again when reopened).
 */
export async function saveDesignIntention(
  projectId: string,
  deliverableId: string | null,
  topic: string,
  text: string,
  choices: ChoiceValue,
): Promise<DesignResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      deliverableId: z.uuid().nullable(),
      topic: z.enum(DESIGN_TOPICS),
      text: value,
      choices: z.object({
        choices: z.array(z.string()).max(20),
        other: z.string().trim().max(MAX_OTHER_CHARS).nullable(),
      }),
    })
    .refine((p) =>
      p.choices.choices.every((c) => isIntentionChoice(p.topic, c)),
    )
    .safeParse({ projectId, deliverableId, topic, text, choices });
  if (!parsed.success) return invalid;
  await requireApproved();
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_design_intention", {
    p_project_id: p.projectId,
    p_deliverable_id: p.deliverableId,
    p_topic: p.topic,
    p_value: p.text,
    p_choices: {
      choices: [...new Set(p.choices.choices)],
      other: p.choices.other || null,
    },
  });
  return designDone(projectId, error, "saveDesignIntention");
}

/**
 * A decision on PO's proposal: confirmed (attached to `target` when PO could
 * not tell, reworded when `text` is given) or set aside.
 */
export async function reviewDesignIntention(
  intentionId: string,
  projectId: string,
  accept: boolean,
  target?: { kind: "direction" } | { kind: "deliverable"; id: string },
  text?: string,
): Promise<DesignResult> {
  const parsed = z
    .object({
      intentionId: z.uuid(),
      projectId: z.uuid(),
      accept: z.boolean(),
      target: z
        .discriminatedUnion("kind", [
          z.object({ kind: z.literal("direction") }),
          z.object({ kind: z.literal("deliverable"), id: z.uuid() }),
        ])
        .optional(),
      text: value.optional(),
    })
    .safeParse({ intentionId, projectId, accept, target, text });
  if (!parsed.success) return invalid;
  await requireApproved();
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_design_intention", {
    p_intention_id: p.intentionId,
    p_accept: p.accept,
    ...(p.target ? { p_target: p.target.kind } : {}),
    ...(p.target?.kind === "deliverable"
      ? { p_deliverable_id: p.target.id }
      : {}),
    ...(p.text ? { p_value: p.text } : {}),
  });
  if (error?.message.includes("target_required"))
    return { ok: false, error: fr.conceptionWork.unassigned.targetRequired };
  return designDone(projectId, error, "reviewDesignIntention");
}
