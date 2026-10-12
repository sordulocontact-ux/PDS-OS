import { ObjectivesSection } from "@/components/strategy/objectives-section";
import { loadKpiActuals } from "@/lib/strategy/kpi-actuals";
import type { StrategyData } from "@/lib/strategy/queries";

/**
 * The « Objectifs & KPIs » panel with the real values of its measured KPIs,
 * read server-side by code (Deezer, after the release).
 */
export async function ObjectivesWork({
  data,
  projectId,
}: {
  data: Pick<
    StrategyData,
    | "strategicObjective"
    | "objectives"
    | "referenceDate"
    | "members"
    | "framingObjective"
  >;
  projectId: string;
}) {
  const actuals = await loadKpiActuals(
    projectId,
    data.referenceDate,
    data.objectives,
  );
  return (
    <ObjectivesSection
      strategicObjective={data.strategicObjective}
      objectives={data.objectives}
      actuals={actuals}
      projectId={projectId}
      members={data.members}
      framingObjective={data.framingObjective}
      referenceDate={data.referenceDate}
    />
  );
}
