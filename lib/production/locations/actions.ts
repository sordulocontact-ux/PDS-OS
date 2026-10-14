"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { holderSchema } from "@/lib/production/post/result";
import {
  changed,
  forbidden,
  invalid,
  nextPosition,
  optionalText,
  preprodFailure,
  sheetOrg,
} from "@/lib/production/preprod/result";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import { LOCATION_ROLES, VERDICTS } from "./types";

// The search for a location (PROD-011 to PROD-013): the owner writes the
// candidates, their media and who is consulted; an opinion goes through
// review_production_location (a consulted person); keeping or discarding a
// place through its functions. RLS checks every write.

const optionSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // Absent: a new candidate.
  optionId: z.uuid().optional(),
  name: z.string().trim().min(1).max(200),
  address: optionalText(500),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v))
    .transform((v) => v || null),
  contactNote: optionalText(500),
  price: z.string().max(40),
  priceNote: optionalText(500),
  availability: optionalText(1000),
  constraints: optionalText(2000),
  verified: z.boolean(),
});

/** « Ajouter un lieu » / « Modifier »: a candidate and what is known of it. */
export async function saveLocationOption(
  input: z.input<typeof optionSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = optionSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const price = parseEurosToCents(p.price);
  if (price === undefined) return invalid;
  const fields = {
    name: p.name,
    address: p.address,
    url: p.url,
    contact_note: p.contactNote,
    price_cents: price,
    price_note: p.priceNote,
    availability: p.availability,
    constraints: p.constraints,
    verification: p.verified ? "verified" : "to_verify",
  };
  const supabase = await createClient();
  if (p.optionId) {
    const { data, error } = await supabase
      .from("production_location_options")
      .update(fields)
      .eq("id", p.optionId)
      .eq("sheet_id", p.sheetId)
      .select("id");
    if (error) return preprodFailure(error);
    return changed(data) ? prepDone(p.projectId) : forbidden;
  }
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_location_options").insert({
    ...fields,
    organization_id: org,
    project_id: p.projectId,
    sheet_id: p.sheetId,
    position: await nextPosition(
      supabase,
      "production_location_options",
      p.sheetId,
    ),
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const mediaSchema = z
  .object({
    projectId: z.uuid(),
    sheetId: z.uuid(),
    optionId: z.uuid(),
    fileId: z.uuid().nullable(),
    url: z.string().trim().max(2000).nullable(),
  })
  .refine(
    (m) =>
      (m.fileId === null) !== (m.url === null) &&
      (m.url === null || /^https:\/\/\S+$/.test(m.url)),
  );

/** A photo, video or plan: a file already uploaded, or a link. */
export async function addLocationMedia(
  input: z.input<typeof mediaSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_location_media").insert({
    organization_id: org,
    project_id: p.projectId,
    sheet_id: p.sheetId,
    option_id: p.optionId,
    file_id: p.fileId,
    url: p.url,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  optionId: z.uuid(),
  // « choose » keeps it; « discard » sets it aside (reason required);
  // « restore » puts it back among the candidates.
  decision: z.enum(["choose", "discard", "restore"]),
  reason: z.string().trim().max(1000),
});

export async function decideLocation(
  input: z.input<typeof decideSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  if (p.decision === "discard" && !p.reason) return invalid;
  const supabase = await createClient();
  const { error } =
    p.decision === "choose"
      ? await supabase.rpc("choose_production_location", {
          p_option_id: p.optionId,
          p_reason: p.reason,
        })
      : await supabase.rpc("discard_production_location", {
          p_option_id: p.optionId,
          // An empty reason puts it back among the candidates.
          p_reason: p.decision === "discard" ? p.reason : "",
        });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const consultSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  holder: holderSchema,
  role: z.enum(LOCATION_ROLES),
});

/** « Consulter »: a member or a Réseau contact gives an opinion with a role. */
export async function addLocationConsult(
  input: z.input<typeof consultSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = consultSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  if (!p.holder.personId && !p.holder.contactId) return invalid;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_location_consults").insert({
    organization_id: org,
    project_id: p.projectId,
    sheet_id: p.sheetId,
    person_id: p.holder.personId,
    contact_id: p.holder.contactId,
    role: p.role,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const removeConsultSchema = z.object({
  projectId: z.uuid(),
  consultId: z.uuid(),
});

export async function removeLocationConsult(
  input: z.input<typeof removeConsultSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = removeConsultSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_location_consults")
    .delete()
    .eq("id", parsed.data.consultId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

const reviewSchema = z.object({
  projectId: z.uuid(),
  optionId: z.uuid(),
  verdict: z.enum(VERDICTS),
  comment: z.string().trim().max(2000),
});

/** « Donner mon avis », a member consulted. */
export async function reviewLocation(
  input: z.input<typeof reviewSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_production_location", {
    p_option_id: p.optionId,
    p_verdict: p.verdict,
    p_comment: p.comment,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}
