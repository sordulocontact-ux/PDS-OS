import { FilterChipLink } from "@/components/ui/filter-chip";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { ConceptionData } from "@/lib/design/conception";
import { DESIGN_TOPICS, DIRECTION_KEY } from "@/lib/design/intentions";
import type { IntentionsState } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import {
  conceptionDeliverableTone,
  intentionsStateTone,
} from "@/lib/ui/state-tones";

type Target = {
  key: string;
  title: string;
  answered: number;
  proposals: number;
  toQualify: boolean;
};

function targetsOf(
  data: Pick<ConceptionData, "deliverables" | "intentions">,
): Target[] {
  const direction = data.intentions.filter((i) => i.target === "direction");
  return [
    {
      key: DIRECTION_KEY,
      title: fr.conceptionWork.targets.direction,
      answered: direction.filter((i) => i.status === "confirmed").length,
      proposals: direction.filter((i) => i.status === "proposed").length,
      toQualify: false,
    },
    ...data.deliverables.map((d) => ({
      key: d.id,
      title: d.title,
      answered: d.answered,
      proposals: d.proposals,
      toQualify: d.status === "to_qualify",
    })),
  ];
}

/**
 * What can be worked on: the release's direction, set apart, then each
 * deliverable (MKT-C2-03: the two levels are not mixed), as pills with how
 * many topics are answered (counted by code). Where the open one stands is
 * told next to its title (TargetBadges).
 */
export function WorkTargets({
  projectId,
  data,
  current,
}: {
  projectId: string;
  data: Pick<ConceptionData, "deliverables" | "intentions">;
  current: string;
}) {
  const t = fr.conceptionWork.targets;
  const [direction, ...deliverables] = targetsOf(data);
  const pill = (target: Target) => (
    <li key={target.key} className="min-w-0">
      <FilterChipLink
        href={routes.projectDesignWork(projectId, target.key)}
        current={target.key === current}
        className="max-w-full"
      >
        <span className="truncate">{target.title}</span>
        <span aria-hidden className="tabular-nums opacity-70">
          {t.count(target.answered, DESIGN_TOPICS.length)}
        </span>
        <span className="sr-only">
          {t.answered(target.answered, DESIGN_TOPICS.length)}
        </span>
      </FilterChipLink>
    </li>
  );
  return (
    <nav aria-label={t.label} className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">{pill(direction)}</ul>
      {deliverables.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">
            {t.deliverablesLabel}
          </p>
          <ul className="flex flex-wrap gap-2">{deliverables.map(pill)}</ul>
        </div>
      )}
    </nav>
  );
}

/**
 * Where the open target stands: its intentions (lib/design/consolidation.ts),
 * PO's proposals waiting, a deliverable still to qualify.
 */
export function TargetBadges({
  data,
  current,
  state,
}: {
  data: Pick<ConceptionData, "deliverables" | "intentions">;
  current: string;
  state: IntentionsState | undefined;
}) {
  const t = fr.conceptionWork.targets;
  const target = targetsOf(data).find((x) => x.key === current);
  if (!target) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state && (
        <StatusBadge tone={intentionsStateTone[state]} size="sm">
          {fr.conception.intentionsStates[state]}
        </StatusBadge>
      )}
      {target.proposals > 0 && (
        <StatusBadge tone="action" size="sm">
          {t.proposals(target.proposals)}
        </StatusBadge>
      )}
      {target.toQualify && (
        <StatusBadge tone={conceptionDeliverableTone.to_qualify} size="sm">
          {t.toQualify}
        </StatusBadge>
      )}
    </div>
  );
}
