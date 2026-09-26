"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { BRIEF_TEXT_FIELDS } from "@/lib/framing/brief";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

const fieldInput = z.object({
  projectId: z.uuid(),
  fieldKey: z.enum(BRIEF_TEXT_FIELDS),
});

/** Each change appends a row: history and provenance are never overwritten. */
async function append(
  projectId: string,
  fieldKey: string,
  row: {
    value: unknown;
    status: "confirmed" | "rejected";
    keepSource: boolean;
  },
): Promise<ActionResult> {
  const access = await requireApproved();
  if (!access.organizationId) return fail("not_found");
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("current_field_values")
    .select("*")
    .eq("project_id", projectId)
    .eq("deliverable", "brief")
    .eq("field_key", fieldKey)
    .maybeSingle();
  if (row.keepSource && !current) return fail("not_found");

  // Confirming a proposal as is keeps its call provenance; an edit is manual.
  const keep = row.keepSource && current?.source_type === "call";
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable: "brief",
    field_key: fieldKey,
    value: (row.value ?? current?.value ?? "") as string,
    status: row.status,
    source_type: keep ? "call" : "manual",
    source_report_item_id: keep ? current?.source_report_item_id : null,
    source_quote: keep ? current?.source_quote : null,
    source_start_seconds: keep ? current?.source_start_seconds : null,
  });
  if (error) return fromDatabaseError(error);

  revalidatePath(routes.projectFraming(projectId));
  return ok;
}

export async function saveBriefField(
  projectId: string,
  fieldKey: string,
  value: string,
): Promise<ActionResult> {
  const parsed = fieldInput
    .extend({ value: z.string().trim().min(1).max(2000) })
    .safeParse({ projectId, fieldKey, value });
  if (!parsed.success) return fail("invalid_input");
  return append(projectId, fieldKey, {
    value: parsed.data.value,
    status: "confirmed",
    keepSource: false,
  });
}

export async function confirmBriefField(
  projectId: string,
  fieldKey: string,
): Promise<ActionResult> {
  if (!fieldInput.safeParse({ projectId, fieldKey }).success)
    return fail("invalid_input");
  return append(projectId, fieldKey, {
    value: null,
    status: "confirmed",
    keepSource: true,
  });
}

export async function rejectBriefField(
  projectId: string,
  fieldKey: string,
): Promise<ActionResult> {
  if (!fieldInput.safeParse({ projectId, fieldKey }).success)
    return fail("invalid_input");
  return append(projectId, fieldKey, {
    value: null,
    status: "rejected",
    keepSource: true,
  });
}
