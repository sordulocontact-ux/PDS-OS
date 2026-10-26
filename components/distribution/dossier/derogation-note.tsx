import { RevokeDerogation } from "@/components/distribution/dossier/derogation-form";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { Derogation } from "@/lib/distribution/validation";
import { fr } from "@/lib/i18n/fr";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

/** A derogation of the direction, as the owner and the validator read it. */
export function DerogationNote({
  derogation,
  head,
  revoke,
}: {
  derogation: Derogation;
  head?: string;
  revoke?: string;
}) {
  const d = fr.distributionJourney.derogation;
  return (
    <ToneCallout
      tone="warning"
      as="div"
      contentClassName="flex flex-col gap-1.5"
    >
      {head && <strong className="font-semibold">{head}</strong>}
      <span>
        {d.line(
          derogation.grantedBy,
          formatShortInstant(derogation.grantedAt),
          derogation.scope.map((x) => d.scopes[x].toLowerCase()).join(", "),
          formatShortDay(derogation.dueOn),
        )}
      </span>
      <span>{d.riskLine(derogation.risk)}</span>
      <span>{d.reasonLine(derogation.reason)}</span>
      {revoke && <RevokeDerogation projectId={revoke} />}
    </ToneCallout>
  );
}
