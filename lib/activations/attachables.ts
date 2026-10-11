import "server-only";

import type { ActivationKind } from "@/lib/activations/model";
import type { ActivationRecord } from "@/lib/activations/types";
import { createClient } from "@/lib/supabase/server";

export type Attachable = {
  sourceKind: "lever" | "deliverable" | "handoff";
  sourceId: string;
  label: string;
  // The kind proposed by code from the source, changed in the form.
  kind: ActivationKind;
  // Activations already made from this lever (a lever may run several).
  existing: number;
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** A lever's kind, read in its words (« Influence », « Relations presse »,
 * « Live / showcase »…); anything else is « Autre ». */
export function kindOfLever(label: string): ActivationKind {
  const l = normalize(label);
  if (/influen/.test(l)) return "influence";
  if (/(presse|press|media|rp\b|relations)/.test(l)) return "press";
  if (/(live|showcase|session|concert|evenement|event)/.test(l)) return "event";
  if (/(clip|video|contenu|content|capsule)/.test(l)) return "content";
  return "other";
}

/**
 * What the Stratégie and the Production decided that has no activation yet
 * (ticket : « L'utilisateur crée une activation depuis Marketing ou rattache
 * un objet issu de Stratégie, Production… ») : selected levers (several
 * activations allowed, the count shown), committed deliverables and the
 * latest hand-off of each delivered deliverable (one activation each).
 */
export async function loadAttachables(
  projectId: string,
  activations: ActivationRecord[],
): Promise<Attachable[]> {
  const supabase = await createClient();
  const [levers, deliverables, handoffs] = await Promise.all([
    supabase
      .from("levers")
      .select("id, label")
      .eq("project_id", projectId)
      .eq("state", "selected")
      .order("created_at"),
    supabase
      .from("strategy_deliverables")
      .select("id, title")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("production_activation_handoffs")
      .select("id, deliverable_id, confirmed_at")
      .eq("project_id", projectId)
      .order("confirmed_at", { ascending: false }),
  ]);
  const taken = (key: "deliverableId" | "handoffId", id: string) =>
    activations.some((a) => a[key] === id);
  const titleOf = (id: string) =>
    deliverables.data?.find((d) => d.id === id)?.title ?? "—";

  const seen = new Set<string>();
  const latestHandoffs = (handoffs.data ?? []).filter((h) => {
    if (seen.has(h.deliverable_id)) return false;
    seen.add(h.deliverable_id);
    return true;
  });
  return [
    ...(levers.data ?? []).map((l) => ({
      sourceKind: "lever" as const,
      sourceId: l.id,
      label: l.label,
      kind: kindOfLever(l.label),
      existing: activations.filter((a) => a.leverId === l.id).length,
    })),
    // A delivered deliverable is offered through its hand-off only.
    ...(deliverables.data ?? [])
      .filter((d) => !seen.has(d.id) && !taken("deliverableId", d.id))
      .map((d) => ({
        sourceKind: "deliverable" as const,
        sourceId: d.id,
        label: d.title,
        kind: "content" as const,
        existing: 0,
      })),
    ...latestHandoffs
      .filter(
        (h) =>
          !taken("handoffId", h.id) &&
          !taken("deliverableId", h.deliverable_id),
      )
      .map((h) => ({
        sourceKind: "handoff" as const,
        sourceId: h.id,
        label: titleOf(h.deliverable_id),
        kind: "content" as const,
        existing: 0,
      })),
  ];
}
