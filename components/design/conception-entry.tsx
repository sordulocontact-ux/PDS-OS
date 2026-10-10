import { AddDeliverableDialog } from "@/components/design/add-deliverable-dialog";
import { ConceptionCallSheet } from "@/components/design/conception-call-sheet";
import { ConceptionDeliverables } from "@/components/design/conception-deliverables";
import { StartConceptionForm } from "@/components/design/start-conception-form";
import { buttonVariants } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { sectionCardClass } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import type { DesignCallSheetData } from "@/lib/design/call-prep";
import type { ConceptionData } from "@/lib/design/conception";
import type { SheetSummary } from "@/lib/design/sheet-summaries";
import type { ConceptionState } from "@/lib/design/states";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { conceptionStateTone, stageTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * The Conception's home (ticket Conception § 1): the project, the artist,
 * the release, where the Stratégie stands and a compact summary of the
 * deliverables — confirmed apart from the needs still to qualify — then the
 * two ways in: prepare a creative exchange, or start directly. No project
 * navigation repeated, no dashboard.
 */
export function ConceptionEntry({
  projectId,
  context,
  data,
  moduleState,
  sheets,
  callSheet,
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
}) {
  const t = fr.conception.entry;
  const state = data.stage?.state ?? "not_started";
  const locked = state === "awaiting_validation" || state === "validated";
  const strategyState = data.strategyState as keyof typeof t.strategyStates;
  const pending = data.intentions.filter((i) => i.status === "proposed");
  // Once started, anyone who sees the project reads the work (read-only
  // unless they write).
  const canResume = data.started;
  const work = routes.projectDesignWork(projectId);

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
          {data.isOwner ? t.body : t.readOnly}
        </p>
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

      {data.started && pending.length > 0 && (
        <ToneCallout tone="info">
          {t.proposals(pending.length)}{" "}
          <ViewLink
            href={work}
            className="font-medium underline underline-offset-2"
          >
            {t.reviewProposals}
          </ViewLink>
        </ToneCallout>
      )}

      {(callSheet || canResume || (data.canAdd && !data.started)) && (
        <div className="flex flex-col gap-3">
          {data.canAdd && (
            <p className="text-caption text-muted-foreground">
              {t.sources(data.callReportCount)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {data.started
              ? canResume && (
                  <ViewLink
                    href={work}
                    className={buttonVariants({ size: "lg" })}
                  >
                    {t.resume}
                  </ViewLink>
                )
              : data.canAdd && <StartConceptionForm projectId={projectId} />}
            {callSheet && (
              <ConceptionCallSheet projectId={projectId} data={callSheet} />
            )}
          </div>
        </div>
      )}

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
