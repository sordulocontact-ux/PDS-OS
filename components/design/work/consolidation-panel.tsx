import { ConfirmIntentionsButton } from "@/components/design/work/confirm-intentions-button";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDay } from "@/lib/assistant/facts";
import { DIRECTION_KEY } from "@/lib/design/intentions";
import type { IntentionsState } from "@/lib/design/states";
import { conception } from "@/lib/i18n/fr/conception";
import { conceptionIntents } from "@/lib/i18n/fr/conception-intents";
import { intentionsStateTone } from "@/lib/ui/state-tones";

const fr = { conception, conceptionIntents };

export type RetainedIntention = {
  id: string;
  topicLabel: string;
  value: string;
  // Where it comes from: typed by a person, or the source of PO's proposal.
  sourceLabel: string;
};

/**
 * The consolidated intentions of the open target (ticket § 4): where they
 * stand (computed by code), what is retained with its provenance, and the
 * owner's « Confirmer les intentions ». Confirmed intentions are the only
 * ones presented as such; PO's proposals stay apart, below.
 */
export function ConsolidationPanel({
  projectId,
  target,
  state,
  retained,
  proposals,
  confirmation,
  canConfirm,
  impacts = null,
  history = [],
}: {
  projectId: string;
  target: string;
  state: IntentionsState;
  retained: RetainedIntention[];
  // PO's proposals still waiting for this target.
  proposals: number;
  confirmation: { byName: string; at: string } | null;
  canConfirm: boolean;
  // The release's direction (MKT-C2-06): what a revision touches, shown
  // before it is confirmed again, and its earlier confirmations.
  impacts?: {
    topics: string[];
    deliverables: Array<{ title: string; sheetValidated: boolean }>;
  } | null;
  history?: Array<{ byName: string; at: string }>;
}) {
  const t = fr.conceptionIntents.consolidation;
  const blocked =
    proposals > 0
      ? t.blockedProposals(proposals)
      : retained.length === 0
        ? t.blockedNothing
        : null;
  return (
    <PageSection
      id="design-consolidation"
      title={t.title}
      description={t.hint}
      action={
        <StatusBadge tone={intentionsStateTone[state]}>
          {target === DIRECTION_KEY
            ? fr.conception.directionIntentionsStates[state]
            : fr.conception.intentionsStates[state]}
        </StatusBadge>
      }
    >
      {confirmation && (
        <p className="text-caption text-muted-foreground">
          {t.confirmedOn(
            confirmation.byName,
            formatDay(confirmation.at.slice(0, 10)),
          )}
        </p>
      )}
      {retained.length ? (
        <ul className="flex flex-col gap-2">
          {retained.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-1 rounded-2xl border border-border px-4 py-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={state === "confirmed" ? "success" : "neutral"}
                  size="sm"
                >
                  {state === "confirmed" ? t.confirmed : t.retainedBadge}
                </StatusBadge>
                <span className="text-caption text-muted-foreground">
                  {r.topicLabel} · {r.sourceLabel}
                </span>
              </span>
              <span className="text-body-md font-medium break-words">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>{t.noneRetained}</EmptyNote>
      )}
      {impacts && state !== "confirmed" && (
        <ToneCallout tone="warning">
          <span className="flex flex-col gap-1">
            <span className="font-medium">{t.impactsTitle}</span>
            <span>{t.impactsTopics(impacts.topics.join(", "))}</span>
            {impacts.deliverables.length ? (
              <span>
                {t.impactsDeliverables}{" "}
                {impacts.deliverables
                  .map((d) =>
                    d.sheetValidated
                      ? `${d.title} (${t.sheetValidated})`
                      : d.title,
                  )
                  .join(", ")}
              </span>
            ) : (
              <span>{t.impactsNone}</span>
            )}
          </span>
        </ToneCallout>
      )}
      {canConfirm && state !== "confirmed" ? (
        <ConfirmIntentionsButton
          projectId={projectId}
          target={target}
          blocked={blocked}
        />
      ) : (
        !canConfirm &&
        state !== "confirmed" && (
          <p className="text-caption text-muted-foreground">{t.ownerOnly}</p>
        )
      )}
      {history.length > 1 && (
        <details className="text-caption text-muted-foreground">
          <summary className="cursor-pointer">{t.historyTitle}</summary>
          <ul className="flex flex-col gap-1 pt-2">
            {history.slice(1).map((h) => (
              <li key={h.at}>
                {t.historyLine(h.byName, formatDay(h.at.slice(0, 10)))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </PageSection>
  );
}
