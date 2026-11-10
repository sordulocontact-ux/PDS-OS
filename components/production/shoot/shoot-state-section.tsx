import { StepSection } from "@/components/shell/journey/step-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import {
  needsMissingSequences,
  type ShootRecord,
} from "@/lib/production/shoot/rules";
import { formatDate } from "@/lib/release/format";
import { shootStateTone } from "@/lib/ui/state-tones";

import { ShootStateDialog } from "./shoot-state-dialog";

import { LaunchShootButton } from "./launch-shoot-button";

const fr = { productionShoot };

const t = fr.productionShoot.state;

/** Parcours 11: the shoot's state, what was observed, what is missing and
 * what changed; why it cannot start while the sheet is not ready; the
 * retake decision a partial or interrupted shoot calls for. */
export function ShootStateSection({
  projectId,
  sheetId,
  shoot,
  shootDate,
  ready,
  preproductionHref,
  canOrganize,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  // The effective date (Production's, else the Fiche's).
  shootDate: string | null;
  ready: boolean;
  preproductionHref: string;
  canOrganize: boolean;
}) {
  const notStarted = shoot.state === "planned" || shoot.state === "postponed";
  return (
    <StepSection
      id="shoot-state"
      title={t.title}
      description={t.description}
      aside={
        canOrganize && (
          <ShootStateDialog
            projectId={projectId}
            sheetId={sheetId}
            shoot={shoot}
            ready={ready}
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <StatusBadge tone={shootStateTone[shoot.state]}>
            {t.labels[shoot.state]}
          </StatusBadge>
        </div>
        {ready && notStarted && canOrganize && (
          <div>
            <LaunchShootButton projectId={projectId} sheetId={sheetId} />
          </div>
        )}
        {!ready && notStarted && (
          <div className="flex flex-col items-start gap-3">
            <ToneCallout tone="warning">{t.notReady}</ToneCallout>
            <ViewLink
              href={preproductionHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ButtonRoll>{t.toPreproduction}</ButtonRoll>
            </ViewLink>
          </div>
        )}
        {needsMissingSequences(shoot.state) && (
          <ToneCallout tone="warning">
            <span className="font-semibold">{t.retakeTitle}</span>
            {" · "}
            {t.retake}
          </ToneCallout>
        )}
        <FactList
          emptyLabel={t.notFilled}
          facts={[
            {
              label: t.shootDate,
              value: shootDate ? formatDate(shootDate) : t.noShootDate,
            },
            {
              label: t.observations,
              value: shoot.observations,
              valueClassName: "whitespace-pre-line",
            },
            {
              label: t.missingSequences,
              value: shoot.missingSequences,
              valueClassName: "whitespace-pre-line",
            },
            {
              label: t.deviations,
              value: shoot.deviations,
              valueClassName: "whitespace-pre-line",
            },
          ]}
        />
      </div>
    </StepSection>
  );
}
