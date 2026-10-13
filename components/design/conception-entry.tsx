import { AddDeliverableDialog } from "@/components/design/add-deliverable-dialog";
import { ConceptionCallSheet } from "@/components/design/conception-call-sheet";
import { ConceptionDeliverables } from "@/components/design/conception-deliverables";
import { StartConceptionForm } from "@/components/design/start-conception-form";
import { FactList } from "@/components/ui/fact-list";
import { sectionCardClass } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import type { ConceptionData } from "@/lib/design/conception";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import type { ConceptionState } from "@/lib/design/states";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { conceptionStateTone, stageTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * The Conception's home (ticket Conception § 1, MKT-C2-03): its goal and the
 * dossier it ends with in two sentences, the project, the artist, the
 * release, where the Stratégie stands; before the start, the two ways in —
 * the creative exchange first (main action), or start without one; once
 * started, the journey (`journey`: next action, six steps, blockers), then
 * the release's direction (`direction`) apart from the conception of each
 * deliverable. No project navigation repeated.
 */
export function ConceptionEntry({
  projectId,
  context,
  data,
  moduleState,
  sheets,
  callSheet,
  journey,
  identity,
  direction,
}: {
  projectId: string;
  context: { title: string; artistName: string };
  data: ConceptionData;
  // Computed by code from the facts (lib/design/states.ts).
  moduleState: ConceptionState;
  // The Fiches Livrables, once the work is open.
  sheets: SheetSummary[];
  // Prepared by code for the owner while the Conception is open.
  callSheet: DesignCallSheetData | null;
  // Once started: the journey, then the release's direction.
  journey?: React.ReactNode;
  // The artist's identity, read-only (MKT-C2-04).
  identity?: React.ReactNode;
  direction?: React.ReactNode;
}) {
  const t = fr.conception.entry;
  const state = data.stage?.state ?? "not_started";
  const locked = state === "awaiting_validation" || state === "validated";
  const strategyState = data.strategyState as keyof typeof t.strategyStates;
  const j = fr.conceptionJourney;

  return (
    <section
      aria-labelledby="conception-entry-title"
      className={cn(sectionCardClass, "mt-6 flex flex-col gap-8")}
    >
      <div className="flex flex-col gap-2">
        <h2
          id="conception-entry-title"
          className="text-display-sm font-semibold"
        >
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {j.goal} {j.final}
        </p>
        {!data.isOwner && !data.canWrite && (
          <p className="max-w-prose text-caption text-muted-foreground">
            {t.readOnly}
          </p>
        )}
      </div>

      <FactList
        facts={[
          { label: t.facts.project, value: context.title },
          ...(context.artistName
            ? [{ label: t.facts.artist, value: context.artistName }]
            : []),
          {
            label: t.facts.release,
            value: data.known.releaseDate
              ? formatBriefDate(data.known.releaseDate)
              : null,
          },
          {
            label: t.facts.strategy,
            value: (
              <StatusBadge tone={stageTone[strategyState]} size="sm">
                {t.strategyStates[strategyState] ?? data.strategyState}
              </StatusBadge>
            ),
          },
          {
            label: t.facts.conception,
            value: (
              <StatusBadge tone={conceptionStateTone[moduleState]} size="sm">
                {fr.conception.conceptionStates[moduleState]}
              </StatusBadge>
            ),
          },
        ]}
        emptyLabel={t.facts.noRelease}
      />

      {locked && (
        <p className="text-body-md text-muted-foreground">{t.locked}</p>
      )}

      {!data.started && data.canAdd && (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted-foreground">
            {t.sources(data.callReportCount)}
          </p>
          <div className="flex flex-wrap gap-2">
            {callSheet && (
              <ConceptionCallSheet
                projectId={projectId}
                data={callSheet}
                variant="default"
              />
            )}
            <StartConceptionForm projectId={projectId} />
          </div>
        </div>
      )}

      {journey}
      {identity}
      {direction}

      <ConceptionDeliverables
        projectId={projectId}
        deliverables={data.deliverables}
        sheets={sheets}
        canWork={data.started}
        canRemove={data.canAdd}
        action={
          data.canAdd ? (
            <AddDeliverableDialog
              projectId={projectId}
              levers={data.levers}
              calls={data.calls}
            />
          ) : undefined
        }
      />
    </section>
  );
}
