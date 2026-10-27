import "server-only";

import { cache } from "react";

import { kindOfLever } from "@/lib/activations/kind-of-lever";
import type { ActivationKind } from "@/lib/activations/model";
import type { ActivationRecord } from "@/lib/activations/types";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export type LeverState = "proposed" | "later" | "created";

export type LeverItem = {
  leverId: string;
  label: string;
  // The kind proposed by code from the lever's words; the mode is chosen on
  // the line for Influence and RP.
  kind: ActivationKind;
  state: LeverState;
  activationId: string | null;
};

export type LeverBoard = {
  // The validated Brief de sortie's version (« Brief de sortie V1 »), null
  // while the Stratégie is not validated: no lever to prepare yet.
  briefVersion: number | null;
  items: LeverItem[];
};

/** The rows « Leviers à préparer » is computed from, once per request: they
 * do not depend on the activations, so a journey starts them with the
 * board instead of after it (page loads audit, docs/ARCHITECTURE.md § 3 bis). */
export const loadLeverRows = cache(async (projectId: string) => {
  const supabase = await createClient();
  const [brief, levers, choices] = await Promise.all([
    supabase
      .from("strategy_documents")
      .select("version")
      .eq("project_id", projectId)
      .eq("kind", "brief")
      .eq("state", "approved")
      .order("version", { ascending: false })
      .limit(1),
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .eq("review_status", "confirmed")
      .order("created_at"),
    supabase
      .from("activation_lever_choices")
      .select("lever_id, state")
      .eq("project_id", projectId),
  ]);
  const failed = [brief, levers, choices].map((r) => r.error).find(Boolean);
  if (failed) console.error("loadLevers:", failed.message);
  return { brief, levers, choices };
});

/**
 * « Leviers à préparer » (proto ac0): each lever retained in the validated
 * Brief de sortie, and whether an activation was created from it, it waits
 * (« Plus tard », activation_lever_choices) or it is still to prepare.
 * Computed at each read.
 */
export const loadLevers = cache(
  async (
    projectId: string,
    activations: ActivationRecord[],
  ): Promise<LeverBoard> => {
    const { brief, levers, choices } = await loadLeverRows(projectId);
    const version = brief.data?.[0]?.version ?? null;
    if (version === null) return { briefVersion: null, items: [] };
    return {
      briefVersion: version,
      items: (levers.data ?? []).map((l) => {
        const made = activations.find((a) => a.leverId === l.id);
        return {
          leverId: l.id,
          label: l.label,
          kind: kindOfLever(l.label),
          state: made
            ? "created"
            : choices.data?.some((c) => c.lever_id === l.id)
              ? "later"
              : "proposed",
          activationId: made?.id ?? null,
        };
      }),
    };
  },
);

/**
 * The due date proposed for an activation (proto « Proposée : J+7 dans le
 * calendrier de lancement »): the earliest temps fort of a deliverable of
 * its lever, else the release date. Null when neither is known.
 */
export const proposedDue = cache(
  async (
    projectId: string,
    leverId: string | null,
  ): Promise<{ date: string; from: string | null } | null> => {
    const supabase = await createClient();
    if (leverId) {
      const { data: deliverables } = await supabase
        .from("strategy_deliverables")
        .select("id")
        .eq("lever_id", leverId);
      const ids = (deliverables ?? []).map((d) => d.id);
      if (ids.length > 0) {
        const { data } = await supabase
          .from("milestones")
          .select("title, occurs_on")
          .in("deliverable_id", ids)
          .order("occurs_on")
          .limit(1);
        if (data?.[0]) return { date: data[0].occurs_on, from: data[0].title };
      }
    }
    const project = await getProject(projectId);
    return project?.dueDate ? { date: project.dueDate, from: null } : null;
  },
);

/** The campaign's concept for an influence in house (proto: « Concept de
 * campagne · Brief de sortie V1 › Narratif »): the Stratégie's confirmed
 * narrative, read where it lives, never copied. */
export const campaignConcept = cache(
  async (projectId: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("current_field_values")
      .select("value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "strategy")
      .eq("field_key", "narrative");
    if (error) console.error("campaignConcept:", error.message);
    const row = (data ?? []).find((f) => f.status === "confirmed");
    return typeof row?.value === "string" && row.value.trim()
      ? row.value
      : null;
  },
);
