import "server-only";

import type { BudgetLine } from "@/lib/budget/types";
import { callPrepDefaults } from "@/lib/calls/prep/defaults";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import { listProjectCreatives } from "@/lib/projects/creatives";
import type { ProjectDetail } from "@/lib/projects/types";
import { strategyCallTopics } from "@/lib/strategy/call-prep";
import type { StrategyData } from "@/lib/strategy/queries";

/**
 * What the common call form of the Stratégie opens with (proto
 * PREP_CALL.strat): the 8 dimensions as the agenda, the owner, the creative
 * team and the artist, the proto's objective.
 */
export async function strategySheetData(
  project: Pick<ProjectDetail, "id" | "title" | "ownerName" | "artistName">,
  data: StrategyData,
  budgetLines: BudgetLine[],
): Promise<CallPrepDefaults> {
  const t = fr.callPrep.kinds;
  const topics = strategyCallTopics({ ...data, budgetLines });
  const creatives = await listProjectCreatives(project.id);
  return callPrepDefaults({
    kind: "strategy",
    projectId: project.id,
    noun: "exchange",
    title: t.strategy.title,
    points: topics.map((x) => ({
      key: x.key,
      topic: x.topic,
      minutes: x.minutes,
      questions: x.questions,
    })),
    proposal: {
      personIds: creatives.map((c) => c.personId),
      names: [project.ownerName, project.artistName].filter(
        (name): name is string => Boolean(name?.trim()),
      ),
    },
    goal: t.strategy.goal(project.title),
    facts: [
      {
        label: fr.callPrep.documents,
        value: t.strategy.documents(project.artistName || null),
      },
      { label: t.subjects, value: t.strategy.subjects },
    ],
  });
}
