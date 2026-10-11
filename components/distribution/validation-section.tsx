import { PrepareVersionButton } from "@/components/distribution/anomaly-forms";
import {
  RejectButton,
  ValidatorButton,
} from "@/components/distribution/validation-forms";
import { VersionList } from "@/components/distribution/version-list";
import { PageSection } from "@/components/shell/page-section";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  decideDistributionVersion,
  submitDistributionVersion,
} from "@/lib/distribution/validation-actions";
import type { DistributionView } from "@/lib/distribution/view";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { distributionVersionTone } from "@/lib/ui/state-tones";

const t = fr.distribution.validation;

/**
 * The human validation (ticket § 6.7, CA06): who validates, the version
 * waiting or validated, what changed at the sources since, « Soumettre »
 * for the owner and « Valider » / « Refuser » for the validator asked.
 */
export function ValidationSection({
  projectId,
  view,
}: {
  projectId: string;
  view: DistributionView;
}) {
  const { validator, open, gate, drift, canEdit, canDecide, versions } = view;
  const next = (versions[0]?.number ?? 0) + 1;
  return (
    <PageSection
      id="dossier-validation"
      title={t.title}
      description={t.description}
      card
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-0.5">
            <p className="text-sm text-muted-foreground">{t.validator}</p>
            <p className="font-medium">{validator?.name ?? "—"}</p>
          </div>
          {canEdit && !open && (
            <ValidatorButton
              projectId={projectId}
              current={validator?.personId ?? null}
              options={view.validatorOptions}
            />
          )}
        </div>
        {!validator && (
          <ToneCallout tone="warning">{t.noValidator}</ToneCallout>
        )}

        {open && (
          <div className="grid gap-2">
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {t.version(open.number)}
              <StatusBadge
                tone={distributionVersionTone[open.status]}
                size="sm"
              >
                {t.status[open.status]}
              </StatusBadge>
            </p>
            <p className="text-sm text-muted-foreground">
              {open.status === "pending"
                ? t.waitingFor(open.validatorName)
                : open.decidedAt
                  ? t.decidedLine(
                      open.decidedBy,
                      formatShortDate(open.decidedAt),
                    )
                  : null}
            </p>
            {canEdit && open.status === "approved" && (
              <div>
                <PrepareVersionButton
                  projectId={projectId}
                  current={open.number}
                />
              </div>
            )}
            {canDecide && (
              <div className="flex flex-wrap gap-2">
                <ConfirmButton
                  label={t.approve}
                  variant="default"
                  title={t.approveTitle(open.number)}
                  body={t.approveBody}
                  confirmLabel={t.approve}
                  pendingLabel={fr.dialogs.saving}
                  done={t.decided}
                  run={decideDistributionVersion.bind(null, {
                    projectId,
                    versionId: open.id,
                    approve: true,
                    note: "",
                  })}
                />
                <RejectButton
                  projectId={projectId}
                  versionId={open.id}
                  number={open.number}
                />
              </div>
            )}
          </div>
        )}

        {open && drift.length > 0 && (
          <ToneCallout tone="warning">
            <span className="block">{t.drift(open.number)}</span>
            {drift.map((line) => (
              <span
                key={`${line.section}-${line.label}`}
                className="block break-words"
              >
                {t.driftLine(
                  `${line.section} · ${line.label}`,
                  line.before,
                  line.now,
                )}
              </span>
            ))}
          </ToneCallout>
        )}

        {canEdit && !open && (
          <div className="grid gap-2">
            {gate.allowed ? (
              <div>
                <ConfirmButton
                  label={t.submit(next)}
                  variant="default"
                  size="lg"
                  title={t.submitTitle(next)}
                  body={[
                    t.submitBody(validator?.name ?? "—"),
                    ...gate.warnings,
                  ].join(" ")}
                  confirmLabel={t.submitConfirm}
                  pendingLabel={fr.dialogs.saving}
                  done={t.submitted}
                  run={submitDistributionVersion.bind(null, { projectId })}
                />
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">{t.cannotSubmit}</p>
                <ul className="grid gap-1 text-sm text-muted-foreground">
                  {gate.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </>
            )}
            {gate.allowed &&
              gate.warnings.map((warning) => (
                <p key={warning} className="text-sm text-muted-foreground">
                  {warning}
                </p>
              ))}
          </div>
        )}

        <VersionList versions={versions} />
      </div>
    </PageSection>
  );
}
