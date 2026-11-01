import { notFound } from "next/navigation";

import { CallFacts } from "@/components/calls/call-facts";
import { FramingStepFrame } from "@/components/framing/framing-step-frame";
import { FramingExchange } from "@/components/framing/start/framing-exchange";
import { KnownSummary } from "@/components/framing/start/known-summary";
import { StartWays } from "@/components/framing/start/start-ways";
import { linesOf } from "@/lib/framing/brief-snapshot";
import { callSheetData } from "@/lib/framing/call-sheet-data";
import { QUESTIONS } from "@/lib/framing/dimensions";
import { framingJourneyContext } from "@/lib/framing/journey-context";
import { recommendedStart } from "@/lib/framing/lines";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

/**
 * Cadrage › Démarrer le cadrage (proto frEntry, ticket § 1 and § 5): the
 * acceptance and the project, what it already knows, then the two ways in;
 * once chosen, « Départ » — started with PO, or the framing exchange from
 * its preparation to its summary to the participants. Started with PO, the
 * two ways in stay offered: the start can always change.
 */
export default async function FramingStartPage({
  params,
}: PageProps<"/app/projects/[projectId]/framing/start">) {
  const { projectId } = await params;
  const ctx = await framingJourneyContext(projectId);
  if (!ctx) notFound();
  const { k, assessment, project, canEdit, call, access } = ctx;
  const t = fr.framingJourney.start;
  const step = ctx.steps[0];
  const chosen = Boolean(call) || step.status === "done";

  let body: React.ReactNode;
  if (call)
    body = (
      <FramingExchange
        call={call}
        assessment={assessment}
        canEdit={canEdit}
        ownerName={project.ownerName}
        validatorName={ctx.validator?.name ?? null}
        mePersonId={access.personId}
      />
    );
  else if (chosen) {
    const started = project.stages.find((s) => s.key === "framing");
    body = (
      <>
        <CallFacts
          facts={[
            {
              label: t.departure,
              value: t.departureDirect(
                project.ownerName,
                started?.stateChangedAt
                  ? formatShortInstant(started.stateChangedAt)
                  : "—",
              ),
            },
          ]}
        />
        {/* The way in can still change while the Cadrage is worked on
            (Sacha 01/11/2026): an exchange after all, or back to PO. */}
        {canEdit && ctx.stage === "in_progress" && (
          <StartWays
            projectId={projectId}
            recommended={recommendedStart(assessment.counts)}
            reason={null}
            callDefaults={await callSheetData(k, assessment)}
            started
          />
        )}
      </>
    );
  } else {
    const lines = Object.fromEntries(
      Object.keys(QUESTIONS).map((key) => [key, linesOf(key, k)]),
    );
    const reco = recommendedStart(assessment.counts);
    body = (
      <>
        <CallFacts
          facts={[
            ...(k.acceptedAt
              ? [
                  {
                    label: t.accepted,
                    value: t.acceptedValue(
                      formatDay(k.acceptedAt),
                      project.ownerName,
                    ),
                  },
                ]
              : []),
            {
              label: t.project,
              value: t.projectValue(
                project.title,
                projectKindLabel({
                  type: project.type,
                  musicFormat: project.musicFormat,
                  contentFormatName: project.contentFormat?.name ?? null,
                }),
                project.artistName || null,
                project.dueDate ? formatDay(project.dueDate) : null,
              ),
            },
          ]}
        />
        <KnownSummary assessment={assessment} lines={lines} />
        {canEdit ? (
          <StartWays
            projectId={projectId}
            recommended={reco}
            reason={
              reco === "call"
                ? t.reason(
                    assessment.counts.missing,
                    assessment.counts.to_confirm,
                  )
                : null
            }
            callDefaults={await callSheetData(k, assessment)}
          />
        ) : (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.waiting(project.ownerName ?? "—")}
          </p>
        )}
      </>
    );
  }

  return (
    <FramingStepFrame projectId={projectId} stepKey="start">
      <div className="flex flex-col gap-5">{body}</div>
    </FramingStepFrame>
  );
}
