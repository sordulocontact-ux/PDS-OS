import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import type { ActivationKind, SheetStatus } from "@/lib/activations/model";
import {
  sheetFieldKeys,
  toSheetFields,
  type SheetFields,
  type SheetVersion,
} from "@/lib/activations/sheets";
import { formatDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

/** Every version of an activation's sheets, newest first. */
export const loadSheets = trackedCache(
  async (
    activationId: string,
    activationKind: ActivationKind,
  ): Promise<SheetVersion[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activation_sheets")
      .select(
        "id, kind, target_id, version, fields, status, decided_by, decided_at, decision_comment, updated_at",
      )
      .eq("activation_id", activationId)
      .order("version", { ascending: false });
    if (error) console.error("loadSheets:", error.message);
    return (data ?? []).map((s) => {
      const kind = s.kind as SheetVersion["kind"];
      return {
        id: s.id,
        kind,
        targetId: s.target_id,
        version: s.version,
        fields: toSheetFields(s.fields, sheetFieldKeys(kind, activationKind)),
        status: s.status as SheetStatus,
        decidedBy: s.decided_by,
        decidedAt: s.decided_at,
        decisionComment: s.decision_comment,
        updatedAt: s.updated_at,
      };
    });
  },
);

/** The versions of one sheet (a framing, the generic concept, one
 * collaboration's concept), newest first. */
export const versionsOf = (
  sheets: SheetVersion[],
  kind: "framing" | "concept",
  targetId: string | null,
) => sheets.filter((s) => s.kind === kind && s.targetId === targetId);

/**
 * What PDS OS already knows for a framing, with its provenance (ticket :
 * « PO reprend le projet, l'artiste, l'objectif, la cible, les plateformes,
 * les jalons… avec leur provenance ») : the Stratégie's confirmed answers,
 * the calendar's milestones of the channel, the project's artist and owner.
 * A proposal of PO not confirmed is never taken.
 */
export async function framingPrefill(
  projectId: string,
  activationKind: ActivationKind,
  project: { artistName: string | null; ownerName: string | null },
): Promise<SheetFields> {
  const supabase = await createClient();
  const channel = activationKind === "press" ? "press" : "influence";
  const [fields, milestones] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "strategy")
      .in("field_key", [
        "strategic_objective",
        "audiences",
        "positioning",
        "narrative",
      ]),
    supabase
      .from("milestones")
      .select("title, occurs_on")
      .eq("project_id", projectId)
      .eq("channel", channel)
      .order("occurs_on"),
  ]);
  const strategy = (key: string) => {
    const row = fields.data?.find(
      (f) => f.field_key === key && f.status === "confirmed",
    );
    return typeof row?.value === "string" && row.value.trim()
      ? { value: row.value, source: "strategy" as const }
      : undefined;
  };
  const calendar = milestones.data?.length
    ? {
        value: milestones.data
          .map((m) => `${formatDate(m.occurs_on)} · ${m.title}`)
          .join("\n"),
        source: "calendar" as const,
      }
    : undefined;
  const fromProject = (value: string | null) =>
    value ? { value, source: "project" as const } : undefined;
  const prefill: SheetFields =
    activationKind === "press"
      ? {
          objectives: strategy("strategic_objective"),
          audience: strategy("audiences"),
          main_message: strategy("positioning"),
          angles: strategy("narrative"),
          spokesperson: fromProject(project.artistName),
          calendar,
          press_contact: fromProject(project.ownerName),
        }
      : {
          objective: strategy("strategic_objective"),
          audience: strategy("audiences"),
          milestones: calendar,
        };
  return Object.fromEntries(
    Object.entries(prefill).filter(([, v]) => v),
  ) as SheetFields;
}

/** The latest change of the Stratégie's answers, to flag a framing validated
 * before it (« Une modification de Stratégie est signalée et ne réécrit pas
 * silencieusement les décisions déjà prises »). */
export async function strategyChangedAt(
  projectId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("field_values")
    .select("created_at")
    .eq("project_id", projectId)
    .eq("deliverable", "strategy")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.created_at ?? null;
}
