import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { moduleHref, type AnomalyModule } from "@/lib/distribution/anomalies";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.dossier;

/**
 * A reason in head of the owner's step (VISION-UX rule 6, proto
 * `retCallout`): « **Claire Morel** (refuser) : « … » », or The Orchard's
 * corrections as declared, with the module where they are made.
 */
export function DossierReturn({
  projectId,
  firstMasterId,
  by,
  outcome,
  note,
  module,
}: {
  projectId: string;
  firstMasterId: string | null;
  by: string;
  outcome: string;
  note: string;
  module: AnomalyModule | null;
}) {
  const name = module ? fr.distribution.anomalies.modules[module] : null;
  const fixable =
    module && module !== "distribution" && module !== "distributor";
  return (
    <ToneCallout
      tone="warning"
      as="div"
      role="note"
      contentClassName="flex flex-col gap-2"
    >
      <span>
        <strong className="font-semibold">{by}</strong> ({outcome}) : « {note} »
      </span>
      {name && (
        <span>
          {t.correctIn} <strong className="font-semibold">{name}</strong>
        </span>
      )}
      {fixable && (
        <span>
          <ViewLink
            href={moduleHref(module, { projectId, firstMasterId })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {fr.distributionJourney.prep.correctIn(name ?? "")}
          </ViewLink>
        </span>
      )}
    </ToneCallout>
  );
}
