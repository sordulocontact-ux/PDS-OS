import "server-only";

import type { BudgetLine } from "@/lib/budget/types";
import { nextRoundHourInput } from "@/lib/calls/format";
import { listProjectCreatives } from "@/lib/projects/creatives";
import type { ProjectDetail } from "@/lib/projects/types";
import {
  strategyCallPurpose,
  strategyCallTopics,
  type StrategyCallSheetData,
} from "@/lib/strategy/call-prep";
import type { StrategyData } from "@/lib/strategy/queries";

/** What « Préparer un échange » of the Stratégie opens with. */
export async function strategySheetData(
  project: Pick<ProjectDetail, "id" | "ownerName" | "artistName">,
  data: StrategyData,
  budgetLines: BudgetLine[],
): Promise<StrategyCallSheetData> {
  const topics = strategyCallTopics({ ...data, budgetLines });
  const creatives = await listProjectCreatives(project.id);
  const people = [
    project.ownerName,
    ...creatives.map((c) => c.name),
    project.artistName,
  ].filter((name): name is string => Boolean(name?.trim()));
  return {
    topics,
    purpose: strategyCallPurpose(topics),
    people: [...new Set(people)],
    defaultOccurredAt: nextRoundHourInput(new Date()),
  };
}
