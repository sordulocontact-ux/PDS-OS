import { DeclarationButton } from "@/components/distribution/declaration-forms";
import { ProofLinks } from "@/components/distribution/tracking-cycle";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PlatformsView } from "@/lib/distribution/platforms-queries";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { distributionAvailabilityTone } from "@/lib/ui/state-tones";

const t = fr.distribution.platforms;

/**
 * The public availability (§ 7): non déclarée, déclarée, vérifiée
 * partiellement, vérifiée — the last only once a person verified every
 * platform of reference (CA16). The owner declares it after the deposit.
 */
export function AvailabilityCard({
  projectId,
  view,
}: {
  projectId: string;
  view: PlatformsView;
}) {
  const { availability, cycle } = view;
  const declared = cycle?.available ?? null;
  const canDeclare =
    view.canEdit && view.organizationId !== null && cycle?.deposit && !declared;
  return (
    <PageSection id="availability" title={t.availability} card>
      <div className="grid gap-3">
        <p className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={distributionAvailabilityTone[availability.state]}>
            {t.availabilityStates[availability.state]}
          </StatusBadge>
          <span className="text-sm text-muted-foreground">
            {[
              t.availabilitySummary(
                availability.verified,
                availability.reference,
              ),
              availability.withoutLink
                ? t.withoutLink(availability.withoutLink)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </p>
        {declared && (
          <div className="grid gap-0.5 text-sm text-muted-foreground">
            <p>
              {fr.distribution.tracking.by(
                declared.declaredBy,
                formatShortDate(declared.declaredAt),
              )}
            </p>
            <ProofLinks declaration={declared} />
          </div>
        )}
        {canDeclare && view.organizationId && (
          <div>
            <DeclarationButton
              projectId={projectId}
              organizationId={view.organizationId}
              kind="available"
            />
          </div>
        )}
        {!cycle?.deposit && (
          <p className="text-sm text-muted-foreground">{t.needsDeposit}</p>
        )}
      </div>
    </PageSection>
  );
}
