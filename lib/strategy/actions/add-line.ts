"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { isLegalItem } from "@/lib/strategy/legal-items";
import { LEVER_PRESETS } from "@/lib/strategy/lever-presets";
import { dbWrite } from "@/lib/strategy/write";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Ajouter … » in the head of a dimension (proto itmadd, VISION-UX rule
// 17): a person's own line, kept at once (« Saisi par … »); « Retenir » /
// « Ne pas retenir » a lever to arbitrate (proto lever); « Commencer la
// stratégie » (proto stratgo po). Owner only, while the strategy is open
// (strategy_is_editable, start_strategy).

const t = fr.strategyDimensions;
const text = (max: number) => z.string().trim().min(1).max(max);

const lineInput = z.discriminatedUnion("dimension", [
  z.object({
    dimension: z.enum(["positioning", "narrative", "audiences", "objectives"]),
    text: text(300),
  }),
  z.object({
    dimension: z.literal("deliverables"),
    text: text(300),
    format: z.string().trim().max(80).optional(),
  }),
  z.object({
    dimension: z.literal("calendar"),
    text: text(300),
    day: z.number().int().min(-365).max(365),
  }),
  z.object({
    dimension: z.literal("budget"),
    text: text(200),
    amount: z.string().trim().min(1).max(40),
  }),
  z.object({
    dimension: z.literal("levers"),
    // « preset:<key> », « lever:<id> » or « other » with its name.
    option: z.string().min(1).max(80),
    other: z.string().trim().max(200).optional(),
  }),
]);
export type AddLineInput = z.input<typeof lineInput>;

type DbError = { code?: string; message?: string } | null;

async function addLever(
  projectId: string,
  organizationId: string,
  option: string,
  other: string | undefined,
): Promise<DbError> {
  const supabase = await createClient();
  if (option.startsWith("lever:")) {
    const { data, error } = await supabase
      .from("levers")
      .update({ state: "selected", review_status: "confirmed" })
      .eq("id", option.slice(6))
      .eq("project_id", projectId)
      .select("id");
    return error ?? (data?.length ? null : { code: "42501" });
  }
  const preset = LEVER_PRESETS.find((p) => `preset:${p.key}` === option);
  const label = preset ? fr.strategyDispositif.presets[preset.key] : other;
  if (!label) return { message: "invalid_input" };
  if (isLegalItem(label)) return { message: "legal_not_lever" };
  const { error } = await supabase.from("levers").insert({
    organization_id: organizationId,
    project_id: projectId,
    label,
    family: preset?.family ?? "other",
    state: "selected",
  });
  return error;
}

async function insert(
  projectId: string,
  organizationId: string,
  input: z.output<typeof lineInput>,
): Promise<DbError> {
  const supabase = await createClient();
  switch (input.dimension) {
    case "positioning":
    case "narrative": {
      const { error } = await supabase.from("field_values").insert({
        organization_id: organizationId,
        project_id: projectId,
        deliverable: "strategy",
        field_key: input.dimension,
        value: input.text,
        status: "confirmed",
        source_type: "manual",
      });
      return error;
    }
    case "audiences": {
      const { error } = await supabase.from("strategy_audiences").insert({
        organization_id: organizationId,
        project_id: projectId,
        segment: input.text.slice(0, 120),
      });
      return error;
    }
    case "objectives":
    case "deliverables":
    case "calendar": {
      const kind =
        input.dimension === "objectives"
          ? "objective"
          : input.dimension === "deliverables"
            ? "deliverable"
            : "milestone";
      const { error } = await supabase.rpc("add_strategy_item", {
        p_project_id: projectId,
        p_kind: kind,
        p_text: input.text,
        ...(input.dimension === "deliverables" && input.format
          ? { p_format: input.format }
          : {}),
        ...(input.dimension === "calendar" ? { p_offset_days: input.day } : {}),
      });
      return error;
    }
    case "budget": {
      const cents = parseEurosToCents(input.amount);
      if (cents === undefined || cents === null)
        return { message: "invalid_input" };
      const { error } = await supabase.from("budget_lines").insert({
        organization_id: organizationId,
        project_id: projectId,
        label: input.text,
        amount_cents: cents,
        status: "planned",
      });
      return error;
    }
    case "levers":
      return addLever(projectId, organizationId, input.option, input.other);
  }
}

/** « Ajouter … »: the line is kept at once, with who typed it. */
export async function addStrategyLine(
  projectId: string,
  input: AddLineInput,
): Promise<WriteResult> {
  const p = lineInput.safeParse(input);
  if (!z.uuid().safeParse(projectId).success || !p.success)
    return { ok: false, error: fr.framing.errors.invalid_input };
  const access = await requireApproved();
  const organizationId = access.organizationId;
  if (!organizationId) return { ok: false, error: fr.framing.errors.forbidden };
  const done = p.data.dimension === "levers" ? t.done.retained : t.done.added;
  return withOutcome(projectId, ["marketing"], done, async () => {
    const error = await insert(projectId, organizationId, p.data);
    if (!error) revalidatePath(routes.project(projectId), "layout");
    return dbWrite(error);
  });
}

const arbitration = z.object({
  type: z.enum(["lever", "need"]),
  id: z.uuid(),
});

/** « Retenir » / « Ne pas retenir » a lever, or a need of the Brief. */
export async function arbitrateLever(
  projectId: string,
  target: z.input<typeof arbitration>,
  retain: boolean,
): Promise<WriteResult> {
  const p = arbitration.safeParse(target);
  if (!z.uuid().safeParse(projectId).success || !p.success)
    return { ok: false, error: fr.framing.errors.invalid_input };
  const access = await requireApproved();
  const done = retain ? t.done.retained : t.done.notRetained;
  return withOutcome(projectId, ["marketing"], done, async () => {
    const supabase = await createClient();
    const state = retain ? "selected" : "rejected";
    let error: DbError = null;
    if (p.data.type === "lever") {
      const res = await supabase
        .from("levers")
        .update({ state })
        .eq("id", p.data.id)
        .eq("project_id", projectId)
        .select("id");
      error = res.error ?? (res.data?.length ? null : { code: "42501" });
    } else {
      const { data: need } = await supabase
        .from("needs")
        .select("id, label, family")
        .eq("id", p.data.id)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!need || !access.organizationId)
        return dbWrite({ message: "not_found" });
      const res = await supabase.from("levers").insert({
        organization_id: access.organizationId,
        project_id: projectId,
        label: need.label,
        family: need.family,
        need_id: need.id,
        state,
      });
      error = res.error;
    }
    if (!error) revalidatePath(routes.project(projectId), "layout");
    return dbWrite(error);
  });
}

/** « Commencer la stratégie »: straight on the 8 dimensions (proto stratgo). */
export async function startStrategyDirect(
  projectId: string,
): Promise<WriteResult> {
  if (!z.uuid().safeParse(projectId).success)
    return { ok: false, error: fr.framing.errors.invalid_input };
  await requireApproved();
  return withOutcome(
    projectId,
    ["marketing"],
    fr.strategyJourney.start.started,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("start_strategy", {
        p_project_id: projectId,
      });
      if (!error) revalidatePath(routes.project(projectId), "layout");
      return dbWrite(error);
    },
  );
}
