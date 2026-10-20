"use server";

import { z } from "zod";

import { loadAgency } from "@/lib/activations/agency/queries";
import { agencyReserves } from "@/lib/activations/agency/reserves";
import { loadActivationData } from "@/lib/activations/load";
import { divergentRows, loadModuleFacts } from "@/lib/activations/modules";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const reportSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  fileId: z.uuid().nullable(),
  url: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]),
  body: z.string().max(50000),
  receivedOn: z.iso.date(),
});

/** « Rattacher le bilan » : file, link or text kept as received. */
export async function receiveAgencyReport(
  input: z.input<typeof reportSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return invalid(fr.activations.errors.urlInvalid);
  const v = parsed.data;
  if (!v.fileId && !v.url && !v.body.trim())
    return invalid(fr.activations.errors.somethingRequired);
  const supabase = await createClient();
  const { error } = await supabase.from("agency_reports").insert({
    activation_id: v.activationId,
    file_id: v.fileId,
    url: textOrNull(v.url),
    body: textOrNull(v.body),
    received_on: v.receivedOn,
    organization_id: access.organizationId ?? "",
    project_id: v.projectId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  reportId: z.uuid(),
  decision: z.enum([
    "provisional",
    "complements_requested",
    "archived",
    "validated",
  ]),
  comment: z.string().max(2000),
});

/** The decision on a report ; its objective reserves are recomputed here by
 * code (never sent by the browser) and kept with the decision. */
export async function decideAgencyReport(
  input: z.input<typeof decideSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const [agency, data, modules] = await Promise.all([
    loadAgency(v.activationId),
    loadActivationData(v.projectId),
    loadModuleFacts(v.projectId),
  ]);
  const reserves = agencyReserves(
    agency.rows,
    divergentRows(
      modules.rows.filter((r) => r.activation_id === v.activationId),
    ).length,
    data.evidences.filter((e) => e.activationId === v.activationId),
    data.metrics.filter((m) => m.activationId === v.activationId),
  );
  if (v.decision === "complements_requested" && !v.comment.trim())
    return invalid(fr.activations.errors.commentRequired);
  if (v.decision === "validated" && reserves.length > 0 && !v.comment.trim())
    return invalid(fr.activations.closure.noteRequired);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_agency_report", {
    p_report_id: v.reportId,
    p_decision: v.decision,
    p_comment: v.comment,
    p_reserves: reserves.length > 0 ? reserves : null,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

/**
 * « Marquer comme envoyé » (proto `agsent`): the recap written by code from
 * the PDS decisions, read (and perhaps edited) by the owner, declared sent
 * at once — PDS OS sends nothing (send_agency_recap).
 */
export async function sendAgencyRecap(input: {
  projectId: string;
  activationId: string;
  subject: string;
  body: string;
}): Promise<WriteResult> {
  await requireApproved();
  const parsed = z
    .object({
      projectId: z.uuid(),
      activationId: z.uuid(),
      subject: z.string().max(300),
      body: z.string().max(20000),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  if (!v.body.trim()) return invalid(fr.activationBrief.recap.errors.message);
  return withOutcome(
    v.projectId,
    ["marketing"],
    fr.activationBrief.recap.done,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("send_agency_recap", {
        p_activation_id: v.activationId,
        p_subject: v.subject,
        p_body: v.body,
      });
      return error ? activationFailure(error) : activationDone(v.projectId);
    },
  );
}
