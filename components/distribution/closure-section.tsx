import {
  ProposeReservesButton,
  RejectClosureButton,
  ReopenClosureButton,
} from "@/components/distribution/closure-forms";
import { PageSection } from "@/components/shell/page-section";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  decideDistributionClosure,
  proposeDistributionClosure,
} from "@/lib/distribution/closure-actions";
import type { ClosureView } from "@/lib/distribution/closure-queries";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { checklistTone } from "@/lib/ui/state-tones";

const t = fr.distribution.closure;

/**
 * The closure (§ 10, CA14-CA15): where it stands, the conditions of a
 * normal one, the reserves grouped by cause with their detail, and the
 * protected actions — propose (owner), validate or refuse (validator),
 * reopen. « Clôturée avec réserves » is never shown in a success colour.
 */
export function ClosureSection({
  projectId,
  view,
}: {
  projectId: string;
  view: ClosureView;
}) {
  const { readiness, current, validator } = view;
  return (
    <div className="grid gap-6">
      <PageSection
        id="closure"
        title={t.title}
        description={t.description}
        card
      >
        <div className="grid gap-4">
          {current?.status === "closed" && (
            <div className="grid gap-2">
              <p className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={current.kind === "normal" ? "success" : "warning"}
                >
                  {t.kinds[current.kind]}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {current.kind === "normal"
                    ? t.closedNormal(
                        formatShortDate(
                          current.decidedAt ?? current.proposedAt,
                        ),
                        current.decidedBy,
                      )
                    : t.closedReserves(
                        formatShortDate(
                          current.decidedAt ?? current.proposedAt,
                        ),
                        current.decidedBy,
                        current.reserves.length,
                      )}
                </span>
              </p>
              {current.arbitration && (
                <p className="text-sm break-words text-muted-foreground">
                  {t.arbitrationLine(current.arbitration)}
                </p>
              )}
              {view.canCheck && (
                <div>
                  <ReopenClosureButton projectId={projectId} />
                </div>
              )}
            </div>
          )}

          {current?.status === "pending" && (
            <div className="grid gap-2">
              <p className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="warning">
                  {t.kinds[current.kind]}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {t.pending(t.kinds[current.kind], current.validatorName)}
                </span>
              </p>
              {current.arbitration && (
                <p className="text-sm break-words text-muted-foreground">
                  {t.arbitrationLine(current.arbitration)}
                </p>
              )}
              {view.canDecide && (
                <div className="flex flex-wrap gap-2">
                  <ConfirmButton
                    label={t.approve}
                    variant="default"
                    title={t.approveTitle}
                    body={t.approveBody}
                    confirmLabel={t.approve}
                    pendingLabel={fr.dialogs.saving}
                    done={t.decided}
                    run={decideDistributionClosure.bind(null, {
                      projectId,
                      closureId: current.id,
                      approve: true,
                      note: "",
                    })}
                  />
                  <RejectClosureButton
                    projectId={projectId}
                    closureId={current.id}
                  />
                </div>
              )}
            </div>
          )}

          {!current && (
            <>
              {!validator && (
                <ToneCallout tone="warning">{t.needsValidator}</ToneCallout>
              )}
              {!readiness.canPropose && (
                <p className="text-sm text-muted-foreground">
                  {t.needsDeposit}
                </p>
              )}
              {view.canEdit && readiness.canPropose && validator && (
                <div className="flex flex-wrap gap-2">
                  {readiness.normalPossible ? (
                    <ConfirmButton
                      label={t.proposeNormal}
                      variant="default"
                      size="lg"
                      title={t.proposeNormal}
                      body={t.proposeNormalBody(validator.name)}
                      confirmLabel={t.proposeSubmit}
                      pendingLabel={fr.dialogs.saving}
                      done={t.proposed}
                      run={proposeDistributionClosure.bind(null, {
                        projectId,
                        kind: "normal",
                        arbitration: "",
                        acknowledged: false,
                      })}
                    />
                  ) : (
                    <ProposeReservesButton
                      projectId={projectId}
                      reserves={readiness.reserves}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </PageSection>

      <PageSection id="closure-conditions" title={t.conditionsTitle} card>
        <ul className="grid gap-3">
          {readiness.conditions.map((condition) => (
            <li
              key={condition.key}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="font-medium">{condition.label}</span>
              <StatusBadge tone={checklistTone(condition.met)} size="sm">
                {condition.met ? t.met : t.unmet}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection
        id="closure-reserves"
        title={t.reservesTitle}
        description={t.reservesDescription}
        card
      >
        {readiness.reserves.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noReserve}</p>
        ) : (
          <ul className="grid gap-3">
            {readiness.reserves.map((reserve) => (
              <li key={reserve.cause}>
                <details className="group">
                  <summary className="cursor-pointer font-medium">
                    {reserve.label}
                  </summary>
                  <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    {reserve.details.map((detail) => (
                      <li key={detail} className="break-words">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
