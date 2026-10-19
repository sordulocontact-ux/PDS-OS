"use server";

import { z } from "zod";

import { loadActivationsBoard } from "@/lib/activations/board";
import { reserveText } from "@/lib/activations/describe";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationJourney;
const scope = { projectId: z.uuid(), activationId: z.uuid() };

/**
 * « Enregistrer la preuve » (proto) : a link, or « Preuve indisponible » with
 * why — then the proof is declared and checked unavailable at once, so the
 * activation moves on and the reason stays in its record.
 */
export async function provideProof(input: {
  projectId: string;
  activationId: string;
  url: string;
  unavailable: boolean;
  why: string;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z
    .object({
      ...scope,
      url: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]),
      unavailable: z.boolean(),
      why: z.string().max(1000),
    })
    .safeParse(input);
  if (!v.success) return invalid(t.errors.proofLink);
  const d = v.data;
  if (d.unavailable && !d.why.trim()) return invalid(t.errors.proofWhy);
  if (!d.unavailable && !d.url) return invalid(t.errors.proofLink);
  return withOutcome(d.projectId, ["marketing"], t.done.proof, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activation_evidence")
      .insert({
        activation_id: d.activationId,
        kind: "publication",
        url: textOrNull(d.url),
        declared_source: "internal",
        declared_on: todayInParis(),
        declaration_note: d.unavailable ? d.why.trim() : null,
        organization_id: access.organizationId ?? "",
        project_id: d.projectId,
      })
      .select("id")
      .single();
    if (error || !data) return activationFailure(error ?? {});
    if (d.unavailable) {
      const { error: checked } = await supabase
        .from("activation_evidence_checks")
        .insert({
          evidence_id: data.id,
          result: "unavailable",
          method: "other",
          note: d.why.trim(),
          organization_id: access.organizationId ?? "",
          project_id: d.projectId,
        });
      if (checked) return activationFailure(checked);
    }
    return activationDone(d.projectId);
  });
}

/** « Vérifier la preuve » / « Contester » (a comment is required to contest). */
export async function decideProof(input: {
  projectId: string;
  evidenceId: string;
  verdict: "verified" | "contested";
  note: string;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z
    .object({
      projectId: z.uuid(),
      evidenceId: z.uuid(),
      verdict: z.enum(["verified", "contested"]),
      note: z.string().max(2000),
    })
    .safeParse(input);
  if (!v.success) return invalid();
  const d = v.data;
  if (d.verdict === "contested" && !d.note.trim())
    return invalid(t.errors.commentToContest);
  return withOutcome(
    d.projectId,
    ["marketing"],
    d.verdict === "verified" ? t.done.verified : t.done.contested,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("activation_evidence_checks")
        .insert({
          evidence_id: d.evidenceId,
          result: d.verdict,
          method: d.verdict === "verified" ? "link_opened" : "other",
          note: textOrNull(d.note),
          organization_id: access.organizationId ?? "",
          project_id: d.projectId,
        });
      return error ? activationFailure(error) : activationDone(d.projectId);
    },
  );
}

const SOURCES = ["internal", "creator", "agency", "platform"] as const;

/** « Enregistrer le relevé » : a declared snapshot, never summed, partial
 * when ticked ; « Donnée indisponible » says the statistics will not come
 * (« Indisponibles », not « Non attendues ») — a later reading lifts it. */
export async function recordSnapshot(input: {
  projectId: string;
  activationId: string;
  value: string;
  platform: string;
  from: string;
  to: string;
  source: (typeof SOURCES)[number];
  partial: boolean;
  unavailable: boolean;
}): Promise<WriteResult> {
  const access = await requireApproved();
  const v = z
    .object({
      ...scope,
      value: z.string().max(20),
      platform: z.string().max(60),
      from: z.union([z.iso.date(), z.literal("")]),
      to: z.union([z.iso.date(), z.literal("")]),
      source: z.enum(SOURCES),
      partial: z.boolean(),
      unavailable: z.boolean(),
    })
    .safeParse(input);
  if (!v.success) return invalid();
  const d = v.data;
  const supabase = await createClient();
  if (d.unavailable)
    return withOutcome(
      d.projectId,
      ["marketing"],
      t.done.statsUnavailable,
      async () => {
        const { error } = await supabase
          .from("marketing_activations")
          .update({ metrics_unavailable: true })
          .eq("id", d.activationId);
        return error ? activationFailure(error) : activationDone(d.projectId);
      },
    );
  const value = Number(d.value.replace(/\s/g, "").replace(",", "."));
  if (!d.value.trim() || !Number.isFinite(value) || value < 0)
    return invalid(t.errors.value);
  if (!d.from || !d.to || d.from > d.to) return invalid(t.errors.period);
  const { data: a } = await supabase
    .from("marketing_activations")
    .select("kind")
    .eq("id", d.activationId)
    .single();
  const counted = a?.kind === "press" || a?.kind === "event";
  return withOutcome(d.projectId, ["marketing"], t.done.snapshot, async () => {
    const { error } = await supabase.from("activation_metrics").insert({
      activation_id: d.activationId,
      metric: counted ? "other" : "views",
      label: counted && a ? t.unitLabels[a.kind as "press" | "event"] : null,
      value,
      unit: "count",
      platform: textOrNull(d.platform),
      period_start: d.from,
      period_end: d.to,
      source: d.source,
      partial: d.partial,
      collected_on: todayInParis(),
      organization_id: access.organizationId ?? "",
      project_id: d.projectId,
    });
    if (error) return activationFailure(error);
    const lifted = await supabase
      .from("marketing_activations")
      .update({ metrics_unavailable: false })
      .eq("id", d.activationId)
      .eq("metrics_unavailable", true);
    return lifted.error
      ? activationFailure(lifted.error)
      : activationDone(d.projectId);
  });
}

/** « Clôturer l'activation » : with the reserves the code lists, kept as
 * shown ; definitive when there are none. */
export async function closeNow(input: {
  projectId: string;
  activationId: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z.object(scope).safeParse(input);
  if (!v.success) return invalid();
  const board = await loadActivationsBoard(v.data.projectId);
  const a = board.summaries.find((x) => x.id === v.data.activationId);
  if (!a) return invalid(fr.activations.errors.notFound);
  const reserves = a.reserves.map((r) => ({ ...r, label: reserveText(r) }));
  return withOutcome(
    v.data.projectId,
    ["marketing"],
    t.done.closed,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("close_activation", {
        p_activation_id: a.id,
        p_kind: reserves.length > 0 ? "with_reserves" : "definitive",
        p_reserves: reserves.length > 0 ? reserves : null,
        p_note: "",
      });
      return error
        ? activationFailure(error)
        : activationDone(v.data.projectId);
    },
  );
}
