import "server-only";

import {
  computeDashboard,
  filtersFromParams,
  hasFilters,
} from "@/lib/marketing/dashboard";
import { loadDashboardInput } from "@/lib/marketing/dashboard-data";
import {
  ACTIVATION_KINDS,
  ACTIVATION_STATUSES,
  VERIFICATIONS,
} from "@/lib/marketing/model";
import { reserveFacts } from "@/lib/marketing/reserves/queries";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { createClient } from "@/lib/supabase/server";

import type { ReviewContext } from "./context";
import { activeClosureOf, isClosedState } from "./journey";
import { computeStanding } from "./standing";

type Query = Record<string, string | string[] | undefined>;

/**
 * « Où on en est » for the person looking: the live dashboard filtered by
 * the URL (folded under « Voir le détail »), the budget only for whoever
 * reads it (the budget keeps the permissions of its module).
 */
export async function loadStanding(ctx: ReviewContext, query: Query) {
  const { access, project, reserves, closures, activations } = ctx;
  const active = activeClosureOf(closures);
  const marketingClosed = active !== null && isClosedState(active.state);
  const canBudget = canSeeProjectBudget(access, project);
  const supabase = await createClient();
  const [{ input, data }, lines] = await Promise.all([
    loadDashboardInput(
      project.id,
      access,
      project,
      reserveFacts(reserves, marketingClosed),
    ),
    canBudget
      ? supabase
          .from("budget_lines")
          .select("id, label, amount_cents, status")
          .eq("project_id", project.id)
          .order("created_at")
      : Promise.resolve(null),
  ]);
  const filters = filtersFromParams(query, {
    kinds: ACTIVATION_KINDS,
    statuses: ACTIVATION_STATUSES,
    levels: VERIFICATIONS,
  });
  const dashboard = computeDashboard(input, filters);
  const live = data.activations.filter((a) => a.archivedAt === null);
  const standing = computeStanding({
    activations,
    dashboard,
    live: { activations: data.activations, evidence: data.evidence },
    reserves,
    marketingClosed,
    budget: lines
      ? {
          envelopeCents: project.budgetCents,
          lines: (lines.data ?? []).map((l) => ({
            id: l.id,
            label: l.label,
            amountCents: l.amount_cents,
            status: l.status,
          })),
        }
      : null,
  });
  return {
    standing,
    filters,
    filtered: hasFilters(filters),
    owners: data.members.filter((m) =>
      live.some((a) => a.ownerPersonId === m.personId),
    ),
    sources: [
      ...new Set(
        data.evidence.flatMap((e) =>
          e.reportedBy ? [e.reportedBy.trim()] : [],
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, "fr")),
  };
}
