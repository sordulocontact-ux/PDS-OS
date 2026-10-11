import "server-only";

import type { ActivationData } from "@/lib/activations/load";
import type { DependencyRecord } from "@/lib/activations/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

type Observed = { delivered_at?: string | null; status?: string | null };

const DONE_STATUS = { contract: "signed", clearance: "cleared", task: "done" };

/**
 * Each dependency read where it lives (« la vue ne copie pas silencieusement
 * leurs valeurs »): resolved when the deliverable is delivered, the contract
 * signed, the borrowing cleared, the task done. A source this session cannot
 * read stays unknown, never resolved. « Changed » = resolved when linked and
 * not any more, or delivered again since.
 */
export async function resolveDependencies(
  projectId: string,
  rows: ActivationData["dependencies"],
): Promise<DependencyRecord[]> {
  if (rows.length === 0) return [];
  const ids = (
    key: "deliverable_id" | "contract_id" | "clearance_id" | "task_id",
  ) => rows.flatMap((r) => (r[key] ? [r[key] as string] : []));
  const supabase = await createClient();
  const [deliverables, deliveries, contracts, clearances, tasks] =
    await Promise.all([
      supabase
        .from("strategy_deliverables")
        .select("id, title")
        .in("id", ids("deliverable_id")),
      supabase
        .from("deliverable_deliveries")
        .select("deliverable_id, delivered_at")
        .in("deliverable_id", ids("deliverable_id")),
      supabase
        .from("contracts")
        .select("id, title, status")
        .in("id", ids("contract_id")),
      supabase
        .from("legal_clearances")
        .select("id, work, status")
        .in("id", ids("clearance_id")),
      supabase
        .from("tasks")
        .select("id, title, status")
        .in("id", ids("task_id")),
    ]);
  const t = fr.activations.dependencies.kinds;

  return rows.map((r) => {
    const observed = (r.observed ?? {}) as Observed;
    const base = {
      id: r.id,
      activationId: r.activation_id,
      kind: r.kind as DependencyRecord["kind"],
      blocking: r.blocking,
    };
    if (r.kind === "deliverable") {
      const d = deliverables.data?.find((x) => x.id === r.deliverable_id);
      const delivery = deliveries.data?.find(
        (x) => x.deliverable_id === r.deliverable_id,
      );
      const deliveredAt = delivery?.delivered_at ?? null;
      return {
        ...base,
        label: d ? `${t.deliverable} « ${d.title} »` : t.deliverable,
        resolved: d ? deliveredAt !== null : null,
        changed:
          Boolean(observed.delivered_at) &&
          deliveredAt !== observed.delivered_at,
        href: d
          ? routes.projectProductionStep(projectId, d.id, "delivery")
          : null,
      };
    }
    const source =
      r.kind === "contract"
        ? contracts.data?.find((x) => x.id === r.contract_id)
        : r.kind === "clearance"
          ? clearances.data?.find((x) => x.id === r.clearance_id)
          : tasks.data?.find((x) => x.id === r.task_id);
    const kind = r.kind as "contract" | "clearance" | "task";
    const name = source
      ? "title" in source
        ? source.title
        : source.work
      : null;
    const done = source ? source.status === DONE_STATUS[kind] : null;
    return {
      ...base,
      label: name ? `${t[kind]} « ${name} »` : t[kind],
      resolved: done,
      changed: observed.status === DONE_STATUS[kind] && done === false,
      href: !source
        ? null
        : kind === "contract"
          ? routes.contract(source.id)
          : kind === "clearance"
            ? routes.projectLegalStep(projectId, "clearances")
            : routes.projectWork(projectId),
    };
  });
}
