import type { AgreementContent } from "@/lib/activations/influence/agreement-content";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";

const fr = { activationInfluence };

const t = fr.activationInfluence;

/**
 * The exact terms and rights of an express agreement, read-only: on the
 * creator's page above « Bon pour accord », and in the owner's preview before
 * the link is sent (recette of 23/10, MKT-INF-002).
 */
export function AgreementTerms({ content }: { content: AgreementContent }) {
  const { terms, rights } = content;
  const fee =
    terms.fee === null
      ? null
      : new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: terms.currency,
        }).format(terms.fee);
  const termRows: Array<[string, string | null]> = [
    [t.negotiation.fee, fee],
    [t.negotiation.deliverables, terms.deliverables],
    [t.negotiation.schedule, terms.schedule],
    [t.negotiation.organicUsage, terms.organic_usage],
    [t.negotiation.adsUsage, terms.ads_usage],
    [t.negotiation.exclusivity, terms.exclusivity],
    [t.negotiation.expenses, terms.expenses],
    [t.negotiation.conditions, terms.conditions],
  ];
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.public.terms}</h2>
        <dl className="flex flex-col gap-2 text-sm">
          {termRows
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
        </dl>
      </section>
      {rights.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t.public.rights}</h2>
          {rights.map((r) => (
            <div key={r.kind} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">{t.rights.kinds[r.kind]}</p>
              <p className="text-muted-foreground">
                {[
                  r.platforms.join(", "),
                  r.supports,
                  r.territory,
                  [r.starts_on, r.ends_on].filter(Boolean).join(" → "),
                  t.rights.remunerations[r.remuneration],
                  r.restrictions,
                ]
                  .filter(Boolean)
                  .join(" · ") || t.public.none}
              </p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
