import { ConfirmIntentionsButton } from "@/components/design/work/confirm-intentions-button";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import type { IntentionsState } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { intentionsStateTone } from "@/lib/ui/state-tones";

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
}: {
  projectId: string;
  target: string;
  state: IntentionsState;
  retained: RetainedIntention[];
  // PO's proposals still waiting for this target.
  proposals: number;
  confirmation: { byName: string; at: string } | null;
  canConfirm: boolean;
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
          {fr.conception.intentionsStates[state]}
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
    </PageSection>
  );
}
