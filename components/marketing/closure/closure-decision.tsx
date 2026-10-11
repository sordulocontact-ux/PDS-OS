import {
  ClosureDecisionForm,
  ReopenClosureButton,
  RequestClosureButton,
} from "@/components/marketing/closure/closure-forms";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { MarketingClosure } from "@/lib/marketing/closure/queries";
import type { Readiness } from "@/lib/marketing/closure/readiness";
import type { Reserve } from "@/lib/marketing/reserves/queries";
import { formatLongDay } from "@/lib/project-history/format";

const t = fr.marketingReview.decision;
const reserveStates = fr.marketingReview.closure.reserves.states;

/**
 * Écran 5: the exact scope, the reserves left after the closing and the
 * consequences, then the one action the viewer may take — the owner asks,
 * the validator decides (never on a closing they asked for), the direction
 * reopens with a reason. A past decision is shown, never rewritten.
 */
export function ClosureDecision({
  projectId,
  closures,
  reference,
  readiness,
  reserves,
  viewer,
}: {
  projectId: string;
  // Newest first.
  closures: MarketingClosure[];
  reference: { id: string; version: number; activations: number } | null;
  readiness: Readiness;
  reserves: Reserve[];
  viewer: { personId: string | null; owner: boolean; direction: boolean };
}) {
  const latest = closures[0] ?? null;
  const active =
    latest &&
    (latest.state === "requested" ||
      latest.state === "closed_clean" ||
      latest.state === "closed_with_reserves")
      ? latest
      : null;
  const remaining = reserves.filter((r) => r.status === "arbitrated");
  const canRequest =
    !active &&
    reference !== null &&
    readiness.blockers.length === 0 &&
    viewer.owner;
  const date = (iso: string | null) => (iso ? formatLongDay(iso) : "");

  return (
    <PageSection id="decision" title={t.title} card>
      {reference && (
        <div className="grid gap-1">
          <h3 className="text-sm font-medium">{t.scope}</h3>
          <p className="text-sm text-muted-foreground">
            {t.scopeLine(reference.version, reference.activations)}
          </p>
        </div>
      )}
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{t.remaining}</h3>
        {remaining.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noRemaining}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {remaining.map((r) => (
              <li key={r.id}>
                {r.description}
                <span className="text-muted-foreground">
                  {" · "}
                  {r.decision
                    ? reserveStates[r.decision as keyof typeof reserveStates]
                    : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{t.consequences}</h3>
        <ul className="grid list-disc gap-0.5 pl-5 text-sm text-muted-foreground">
          {t.consequenceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {latest && !active && (
        <ToneCallout tone="warning">
          {latest.state === "reopened"
            ? t.reopenedLine(
                latest.reopenedBy,
                date(latest.reopenedAt),
                latest.reopenReason ?? "",
              )
            : t.sentBack(
                t.decisions[latest.state as "changes_requested" | "postponed"],
                latest.decidedBy,
                date(latest.decidedAt),
              )}
          {latest.state !== "reopened" && latest.comment && (
            <span className="mt-1 block whitespace-pre-line">
              {latest.comment}
            </span>
          )}
        </ToneCallout>
      )}

      {canRequest && reference && (
        <RequestClosureButton projectId={projectId} reportId={reference.id} />
      )}
      {!active && viewer.owner && !canRequest && (
        <p className="text-sm text-muted-foreground">{t.requestBlocked}</p>
      )}

      {active?.state === "requested" &&
        (viewer.direction && viewer.personId !== active.requestedByPersonId ? (
          <ClosureDecisionForm
            projectId={projectId}
            closureId={active.id}
            suggested={
              readiness.clean ? "closed_clean" : "closed_with_reserves"
            }
          />
        ) : viewer.direction ? (
          <ToneCallout tone="warning">{t.selfApproval}</ToneCallout>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.pending(active.requestedBy, date(active.requestedAt))}
          </p>
        ))}

      {active &&
        (active.state === "closed_clean" ||
          active.state === "closed_with_reserves") && (
          <>
            <ToneCallout tone="success">
              {t.closed(
                fr.marketingReview.status.values[active.state],
                active.decidedBy,
                date(active.decidedAt),
              )}
              <span className="mt-1 block">
                {t.followUpsLeft(remaining.length)}
              </span>
            </ToneCallout>
            {viewer.direction && (
              <ReopenClosureButton
                projectId={projectId}
                closureId={active.id}
              />
            )}
          </>
        )}
    </PageSection>
  );
}
