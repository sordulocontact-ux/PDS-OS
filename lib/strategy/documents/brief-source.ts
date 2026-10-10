import "server-only";

import type { Access } from "@/lib/auth/access";
import { loadBudget } from "@/lib/budget/queries";
import { todayInParis } from "@/lib/insights/dates";
import { projectKindLabel } from "@/lib/projects/labels";
import { getProject } from "@/lib/projects/queries";
import { arbitrations, briefReadiness } from "@/lib/strategy/brief";
import { strategyBudget } from "@/lib/strategy/budget";
import {
  dimensionStatuses,
  type DimensionStatus,
  type StrategyDimension,
} from "@/lib/strategy/dimensions";
import {
  buildBriefSnapshot,
  type BriefSnapshot,
} from "@/lib/strategy/documents/brief-snapshot";
import { loadStrategy, type StrategyData } from "@/lib/strategy/queries";

export type BriefSource = {
  data: StrategyData;
  statuses: DimensionStatus[];
  ready: boolean;
  missing: StrategyDimension[];
  // The Brief as it stands now: what a version would freeze.
  snapshot: BriefSnapshot;
};

/**
 * Everything the live Brief de sortie is made of, read with the user's
 * session (RLS): the strategy, the project's budget lines, the pilotage's
 * states, and the snapshot a version would store. Shared by the Brief page
 * and « Demander la validation », so what is sent is what was shown.
 */
export async function loadBriefSource(
  projectId: string,
  access: Access,
): Promise<BriefSource | null> {
  const [project, data, budgetData] = await Promise.all([
    getProject(projectId),
    loadStrategy(projectId, access),
    loadBudget(projectId),
  ]);
  if (!project || !data) return null;
  const today = todayInParis();
  const statuses = dimensionStatuses({
    ...data,
    today,
    budgetLines: budgetData.lines,
    envelopeCents: project.budgetCents,
  });
  const budget = strategyBudget(
    budgetData.lines,
    data.levers,
    project.budgetCents,
  );
  const snapshot = buildBriefSnapshot({
    data,
    budget,
    toDecide: arbitrations({ ...data, budget, today }),
    project: {
      title: project.title,
      artist: project.artistName,
      kind: projectKindLabel({
        type: project.type,
        musicFormat: project.musicFormat,
        contentFormatName: project.contentFormat?.name ?? null,
      }),
    },
    today,
  });
  return { data, statuses, ...briefReadiness(statuses), snapshot };
}
