import { FactList } from "@/components/ui/fact-list";
import type { BriefIdentity } from "@/lib/design/brief-identity";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

/**
 * The artist's identity in the Brief créatif (MKT-C2-04): the version of
 * the identity the release used, its manifesto and tone, and the release's
 * deviation — said even when there is none.
 */
export function BriefIdentitySection({
  identity,
}: {
  identity: BriefIdentity;
}) {
  const t = fr.conceptionDirection.brief;
  return (
    <section aria-labelledby="brief-identity" className="flex flex-col gap-2">
      <h3 id="brief-identity" className="text-body-lg font-semibold">
        {t.identity.title}
      </h3>
      {identity.version > 0 && (
        <p className="text-caption text-muted-foreground">
          {t.identity.version(
            identity.version,
            identity.approvedOn ? formatBriefDate(identity.approvedOn) : null,
          )}
        </p>
      )}
      {(identity.manifesto || identity.tone) && (
        <FactList
          facts={[
            {
              label: fr.artistIdentity.fields.manifesto,
              value: identity.manifesto,
            },
            {
              label: fr.artistIdentity.fields.tone,
              value: identity.tone,
            },
          ].filter((f) => f.value)}
        />
      )}
      <p className="text-body-md break-words">
        <span className="font-medium">{t.identity.deviation} : </span>
        {identity.deviation ?? t.identity.noDeviation}
      </p>
    </section>
  );
}
