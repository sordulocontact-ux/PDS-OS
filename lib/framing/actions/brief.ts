"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { TEXT_FIELDS, type TextDeliverable } from "@/lib/framing/brief";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

// Text fields of a deliverable (Brief, Strategy, Dossier): the key must belong to it.
const fieldInput = z
  .object({
    projectId: z.uuid(),
    deliverable: z.enum(["brief", "strategy", "design_doc"]),
    fieldKey: z.string(),
  })
  .refine((v) =>
    (TEXT_FIELDS[v.deliverable] as readonly string[]).includes(v.fieldKey),
  );

/** Each change appends a row: history and provenance are never overwritten. */
async function append(
  projectId: string,
  deliverable: TextDeliverable,
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
    .eq("deliverable", deliverable)
    .eq("field_key", fieldKey)
    .maybeSingle();
  if (row.keepSource && !current) return fail("not_found");

  // Confirming a proposal as is keeps its call provenance; an edit is manual.
  const keep = row.keepSource && current?.source_type === "call";
  const { error } = await supabase.from("field_values").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    deliverable,
    field_key: fieldKey,
    value: (row.value ?? current?.value ?? "") as string,
    status: row.status,
    source_type: keep ? "call" : "manual",
    source_report_item_id: keep ? current?.source_report_item_id : null,
    source_quote: keep ? current?.source_quote : null,
    source_start_seconds: keep ? current?.source_start_seconds : null,
  });
  // The strategy and the Dossier are only written while in progress
  // (restrictive RLS policies).
  if (error?.code === "42501" && deliverable !== "brief")
    return fail("stage_locked");
  if (error) return fromDatabaseError(error);

  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

export async function saveField(
  projectId: string,
  deliverable: TextDeliverable,
  fieldKey: string,
  value: string,
): Promise<ActionResult> {
  const parsed = z.string().trim().min(1).max(2000).safeParse(value);
  if (
    !parsed.success ||
    !fieldInput.safeParse({ projectId, deliverable, fieldKey }).success
  )
    return fail("invalid_input");
  return append(projectId, deliverable, fieldKey, {
    value: parsed.data,
    status: "confirmed",
    keepSource: false,
  });
}

export async function confirmField(
  projectId: string,
  deliverable: TextDeliverable,
  fieldKey: string,
): Promise<ActionResult> {
  if (!fieldInput.safeParse({ projectId, deliverable, fieldKey }).success)
    return fail("invalid_input");
  return append(projectId, deliverable, fieldKey, {
    value: null,
    status: "confirmed",
    keepSource: true,
  });
}

export async function rejectField(
  projectId: string,
  deliverable: TextDeliverable,
  fieldKey: string,
): Promise<ActionResult> {
  if (!fieldInput.safeParse({ projectId, deliverable, fieldKey }).success)
    return fail("invalid_input");
  return append(projectId, deliverable, fieldKey, {
    value: null,
    status: "rejected",
    keepSource: true,
  });
}
