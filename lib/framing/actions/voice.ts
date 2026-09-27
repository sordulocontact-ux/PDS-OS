"use server";

import { z } from "zod";

import { done, id, orgId } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { framingProposalSchema } from "@/lib/framing/voice-proposal";
import { createClient } from "@/lib/supabase/server";

const input = z.object({
  projectId: id,
  changes: z
    .array(framingProposalSchema)
    .min(1)
    .max(50)
    // Two values for one field in the same insert would share created_at.
    .refine((changes) => {
      const fields = changes.flatMap((c) =>
        c.kind === "brief" ? [c.field] : [],
      );
      return new Set(fields).size === fields.length;
    }),
});

/**
 * Writes the dictated changes the user accepted. They are confirmed, since a
 * person just reviewed them, and keep the dictated words as provenance
 * (source_type "voice"; who dictated is created_by). Open points have no
 * provenance columns: they are simply added.
 */
export async function applyDictation(
  projectId: string,
  changes: unknown[],
): Promise<ActionResult> {
  const parsed = input.safeParse({ projectId, changes });
  const organizationId = await orgId();
  if (!parsed.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();

  const base = { organization_id: organizationId, project_id: projectId };
  const voice = (quote: string) => ({
    ...base,
    source_type: "voice",
    source_quote: quote,
  });
  const all = parsed.data.changes;

  const fields = all.flatMap((c) =>
    c.kind === "brief"
      ? [
          {
            ...voice(c.quote),
            deliverable: "brief",
            field_key: c.field,
            value: c.value,
            status: "confirmed",
          },
        ]
      : [],
  );
  const needs = all.flatMap((c) =>
    c.kind === "need"
      ? [{ ...voice(c.quote), label: c.label, family: c.family }]
      : [],
  );
  const constraints = all.flatMap((c) =>
    c.kind === "constraint"
      ? [{ ...voice(c.quote), text: c.text, type: "other" }]
      : [],
  );
  const team = all.flatMap((c) =>
    c.kind === "team"
      ? [{ ...voice(c.quote), display_name: c.name, role: c.role || null }]
      : [],
  );
  const points = all.flatMap((c) =>
    c.kind === "open_point" ? [{ ...base, question: c.question }] : [],
  );

  const results = await Promise.all([
    fields.length ? supabase.from("field_values").insert(fields) : null,
    needs.length ? supabase.from("needs").insert(needs) : null,
    constraints.length
      ? supabase.from("framing_constraints").insert(constraints)
      : null,
    team.length ? supabase.from("project_team_members").insert(team) : null,
    points.length ? supabase.from("open_points").insert(points) : null,
  ]);
  return done(projectId, results.find((r) => r?.error)?.error ?? null);
}
