import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";
import { gapNames, type ContractGap } from "@/lib/legal/contract-gaps";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";

const fr = { participationWaivers };
const t = fr.participationWaivers;

/** The way to the waivers and contracts, for whoever opens the Juridique. */
function ParticipationsLink({ projectId }: { projectId: string }) {
  return (
    <ViewLink
      href={legalParticipationsHref(projectId)}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ButtonRoll>{t.callout.link}</ButtonRoll>
    </ViewLink>
  );
}

/**
 * A collective's missing participation contracts, upstream (lot 12,
 * décision 6): what the shoot and the release would refuse, named; the
 * preparation and the recording go on. Nothing when every contract is
 * signed or waived.
 */
export function ContractGapsCallout({
  projectId,
  shoot,
  release,
  canOpenLegal,
}: {
  projectId: string;
  shoot: ContractGap[];
  release: ContractGap[];
  // manage_legal: the link to « Participations et contrats ».
  canOpenLegal: boolean;
}) {
  if (shoot.length === 0 && release.length === 0) return null;
  // The same participations for both: said once.
  const same = gapNames(shoot) === gapNames(release);
  return (
    <div className="flex flex-col items-start gap-3">
      <ToneCallout tone="warning">
        <span className="flex flex-col gap-1">
          <b className="font-semibold">{t.callout.title}</b>
          {same ? (
            <span>{t.callout.both(gapNames(shoot))}</span>
          ) : (
            <>
              {shoot.length > 0 && (
                <span>{t.callout.shoot(gapNames(shoot))}</span>
              )}
              {release.length > 0 && (
                <span>{t.callout.release(gapNames(release))}</span>
              )}
            </>
          )}
          <span>{t.callout.body}</span>
        </span>
      </ToneCallout>
      {canOpenLegal && <ParticipationsLink projectId={projectId} />}
    </div>
  );
}

/**
 * The shoot of a deliverable, blocked (lot 12): which contract is missing,
 * and how to go on (the contract signed, or the direction's waiver).
 * `upstream`: before « Prête pour tournage », said as information only.
 */
export function ShootContractNotice({
  projectId,
  gaps,
  canOpenLegal,
  upstream = false,
}: {
  projectId: string;
  gaps: ContractGap[];
  canOpenLegal: boolean;
  upstream?: boolean;
}) {
  if (gaps.length === 0) return null;
  const names = gapNames(gaps);
  return (
    <div className="flex flex-col items-start gap-3">
      <ToneCallout tone={upstream ? "info" : "warning"}>
        {upstream ? (
          t.shoot.readiness(names)
        ) : (
          <span className="flex flex-col gap-1">
            <b className="font-semibold">{t.shoot.blocked(names)}</b>
            <span>{t.shoot.how(gaps.length)}</span>
          </span>
        )}
      </ToneCallout>
      {canOpenLegal && <ParticipationsLink projectId={projectId} />}
    </div>
  );
}
