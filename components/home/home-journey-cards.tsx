import { GlobalWorkCountReporter } from "@/components/shell/work-count";
import { JourneyActionsCard } from "@/components/work/journey-actions-card";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { work } from "@/lib/i18n/fr/work";
import { loadMyJourneyWork } from "@/lib/work/journeys";

const fr = { work };

/**
 * The home's « Validations qui m'attendent » (the journeys' decisions) and
 * « À vous » (their other actions), every project together (lib/work/
 * journeys.ts, docs/VISION-UX.md § 3). Streamed on their own inside the
 * home's grid: the other cards never wait for every project's journeys.
 * Reports each project's count to the main navigation.
 */
export async function HomeJourneyCards({ access }: { access: Access }) {
  const work = await loadMyJourneyWork();
  const t = fr.work.journeys;
  const rowsOf = (decisions: boolean) =>
    work.projects.flatMap((w) =>
      w.mine
        .filter((a) => (a.step.actor?.kind === "validate") === decisions)
        .map((action) => ({ action, projectTitle: w.projectTitle })),
    );
  const decisions = rowsOf(true);
  const others = rowsOf(false);
  return (
    <>
      {(decisions.length > 0 || can(access, "validate")) && (
        <JourneyActionsCard
          title={t.validations}
          rows={decisions}
          empty={t.validationsEmpty}
          error={work.error && !decisions.length ? t.partial : undefined}
        />
      )}
      <JourneyActionsCard
        title={t.mine}
        rows={others}
        empty={t.mineEmpty}
        action={{ label: t.allWork, href: routes.work }}
        error={work.error && !others.length ? t.partial : undefined}
      />
      <GlobalWorkCountReporter byProject={work.byProject} />
    </>
  );
}
