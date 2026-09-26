"use server";

import { z } from "zod";

import { id, orgId } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { strategyProposalSchema } from "@/lib/strategy/voice-proposal";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  projectId: id,
  changes: z
    .array(strategyProposalSchema)
    .min(1)
    .max(50)
    // Two values for one field in the same insert would share created_at.
    .refine((changes) => {
      const fields = changes.flatMap((c) =>
        c.kind === "field" ? [c.field] : [],
      );
      return new Set(fields).size === fields.length;
    }),
});

/**
 * Writes the dictated strategy changes the user accepted, with their session
 * (RLS: owner, stage in progress). They are confirmed, since a person just
 * reviewed them, and keep the dictated words as provenance (source_type
 * "voice"; who dictated is created_by). A lever starts "to decide": whether
 * it is selected stays a person's choice.
 */
export async function applyStrategyDictation(
  projectId: string,
  changes: unknown[],
): Promise<ActionResult> {
  const parsed = input.safeParse({ projectId, changes });
  const organizationId = await orgId();
  if (!parsed.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();

  const voice = (quote: string) => ({
    organization_id: organizationId,
    project_id: projectId,
    source_type: "voice",
    source_quote: quote,
  });
  const all = parsed.data.changes;

  const fields = all.flatMap((c) =>
    c.kind === "field"
      ? [
          {
            ...voice(c.quote),
            deliverable: "strategy",
            field_key: c.field,
            value: c.value,
            status: "confirmed",
          },
        ]
      : [],
  );
  const levers = all.flatMap((c) =>
    c.kind === "lever"
      ? [
          {
            ...voice(c.quote),
            label: c.label,
            family: c.family,
            state: "to_decide",
            review_status: "confirmed",
          },
        ]
      : [],
  );

  const results = await Promise.all([
    fields.length ? supabase.from("field_values").insert(fields) : null,
    levers.length ? supabase.from("levers").insert(levers) : null,
  ]);
  return done(projectId, results.find((r) => r?.error)?.error ?? null);
}
