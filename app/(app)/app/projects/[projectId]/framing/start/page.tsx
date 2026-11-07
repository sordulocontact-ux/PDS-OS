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
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

/**
 * Cadrage › Démarrer le cadrage (proto frEntry, ticket § 1 and § 5): what
 * the project already knows, then the two ways in (the project's facts are
 * in the module's head, its acceptance in Activité: Ibé 01/11/2026);
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
        projectId={projectId}
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
    const at = started?.stateChangedAt ?? null;
    // The cards still offered: when it started is a pill on « Reprendre
    // avec PO », not a « Départ » line (Sacha 05/11/2026); the line stays
    // for whoever reads without the cards.
    const ways = canEdit && ctx.stage === "in_progress";
    body = ways ? (
      <StartWays
        projectId={projectId}
        recommended={recommendedStart(assessment.counts)}
        reason={null}
        callDefaults={await callSheetData(k, assessment)}
        started
        startedOn={at ? formatShortDay(at, { bare: true }) : null}
      />
    ) : (
      <CallFacts
        facts={[
          {
            label: t.departure,
            value: t.departureDirect(
              project.ownerName,
              at ? formatShortInstant(at) : "—",
            ),
          },
        ]}
      />
    );
  } else {
    const lines = Object.fromEntries(
      Object.keys(QUESTIONS).map((key) => [key, linesOf(key, k)]),
    );
    const reco = recommendedStart(assessment.counts);
    body = (
      <>
        <KnownSummary assessment={assessment} lines={lines} />
        {canEdit ? (
          <StartWays
            projectId={projectId}
            recommended={reco}
            reason={reco === "call" ? t.reason : null}
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
