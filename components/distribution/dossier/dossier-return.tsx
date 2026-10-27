import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { moduleHref, type AnomalyModule } from "@/lib/distribution/anomalies";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

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
  modules,
}: {
  projectId: string;
  firstMasterId: string | null;
  by: string;
  outcome: string;
  note: string;
  // Where it is corrected: the refusal's modules, or The Orchard's one.
  modules: AnomalyModule[];
}) {
  const name = (m: AnomalyModule) => fr.distribution.anomalies.modules[m];
  const fixable = modules.filter(
    (m) => m !== "distribution" && m !== "distributor",
  );
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
      {modules.length > 0 && (
        <span>
          {t.correctIn}{" "}
          <strong className="font-semibold">
            {modules.map(name).join(", ")}
          </strong>
        </span>
      )}
      {fixable.length > 0 && (
        <span className="flex flex-wrap gap-2">
          {fixable.map((m) => (
            <ViewLink
              key={m}
              href={moduleHref(m, { projectId, firstMasterId })}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {fr.distributionJourney.prep.correctIn(name(m))}
            </ViewLink>
          ))}
        </span>
      )}
    </ToneCallout>
  );
}
