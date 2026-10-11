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
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationAgency;

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
 * « Préparer le retour à l'agence » : a draft written by code from the PDS
 * decisions (validated, refused, to discuss…), without the internal notes —
 * then read, edited and validated by a person ; never sent by PDS OS.
 */
export async function prepareAgencyRecap(input: {
  projectId: string;
  activationId: string;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), activationId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const { projectId, activationId } = parsed.data;
  const supabase = await createClient();
  const [{ data: activation }, agency] = await Promise.all([
    supabase
      .from("marketing_activations")
      .select("title")
      .eq("id", activationId)
      .single(),
    loadAgency(activationId),
  ]);
  const sections = (
    Object.keys(t.recap.sections) as (keyof typeof t.recap.sections)[]
  ).flatMap((decision) => {
    const rows = agency.rows.filter(
      (r) => !r.absentSince && r.pdsDecision === decision,
    );
    if (rows.length === 0) return [];
    const name = (r: (typeof rows)[number]) =>
      String(
        r.current.handle
          ? `@${String(r.current.handle).replace(/^@/, "")}`
          : (r.current.name ?? r.current.media ?? r.rowKey),
      );
    return [
      `${t.recap.sections[decision]} :\n${rows.map((r) => `- ${name(r)}`).join("\n")}`,
    ];
  });
  const { error } = await supabase.from("activation_messages").insert({
    activation_id: activationId,
    kind: "agency_recap",
    subject: t.recap.subject(activation?.title ?? ""),
    body: [t.recap.intro, ...sections, t.recap.outro].join("\n\n"),
    organization_id: access.organizationId ?? "",
    project_id: projectId,
  });
  return error ? activationFailure(error) : activationDone(projectId);
}
