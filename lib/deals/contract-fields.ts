import "server-only";

import { dealFieldOf, type FieldSource } from "@/lib/legal/contracts/fields";
import { fieldValues } from "@/lib/legal/contracts/values";
import { loadDealMemos } from "@/lib/deals/memo-queries";
import { formatTermValue } from "@/lib/deals/term-format";
import { loadDealTerms } from "@/lib/deals/term-queries";
import type { TermValue } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";

export type DealFieldValue = { value: string; source: FieldSource };

const centsOf = (value: TermValue | null): number | null =>
  value && typeof value === "object" && "cents" in value
    ? (value.cents as number)
    : null;

/**
 * What the deal already knows of a contract template's fields (Sacha
 * 22/11/2026, « que PDS OS puisse créer le contrat »), read by code, shown
 * prefilled and correctable before the contract is generated:
 * - the party — the deal's label or brand, else its artist's contact — read
 *   the way the Juridique reads a person (fieldValues): its fiche de
 *   renseignements first (civil name, company, address, SIRET…), then the
 *   Réseau; a structure without a fiche is at least a company with its name;
 * - the project and the artist, the organization's name;
 * - the terms of its validated deal memo (else its terms now) as
 *   {{deal.<term>}}, the remuneration from its advance, fee or minimum
 *   guarantee.
 * A value it does not know stays empty for a person to type.
 */
export async function dealFieldValues(
  deal: Deal,
  organizationName: string | null,
): Promise<Record<string, DealFieldValue>> {
  const supabase = await createClient();
  const contactQuery = supabase
    .from("network_contacts")
    .select("id, kind, name, email, phone, city");
  const [memos, terms, { data: contact }] = await Promise.all([
    loadDealMemos(deal.id, deal.kind),
    loadDealTerms(deal.id, deal.kind),
    deal.counterpartId
      ? contactQuery.eq("id", deal.counterpartId).maybeSingle()
      : deal.artistId
        ? contactQuery.eq("artist_id", deal.artistId).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
  ]);
  const { data: fiche } = contact
    ? await supabase
        .from("contact_legal_details")
        .select("details")
        .eq("contact_id", contact.id)
        .maybeSingle()
    : { data: null };

  const validated = memos.find((m) => m.status === "validated");
  const said = validated
    ? validated.terms
    : terms.filter((t) => t.state !== "to_define");
  const pay = ["advance", "fee", "minimum_guarantee"]
    .map((key) => said.find((t) => t.key === key))
    .find(Boolean);

  const details = (fiche?.details ?? {}) as Record<string, string>;
  const company = contact?.kind === "organization";
  const base = fieldValues({
    contact: {
      name: contact?.name ?? deal.artistName ?? "",
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
    },
    // A structure without its fiche: a company, by its name.
    details:
      company && !details.entity_type
        ? {
            entity_type: "company",
            company_name: contact?.name ?? "",
            ...details,
          }
        : details,
    creditRoles: [],
    titles: deal.titleLabel ? [deal.titleLabel] : [],
    project: {
      title: deal.projectTitle ?? deal.titleLabel ?? "",
      artistName: deal.artistName,
    },
    feeCents: pay ? centsOf(pay.value) : null,
    organizationName,
  });

  const out: Record<string, DealFieldValue> = {};
  for (const [id, v] of Object.entries(base))
    if (v && !v.notApplicable) out[id] = { value: v.value, source: v.source };
  // The remuneration as the term says it (« Avance de 15 000 € HT »).
  if (pay) {
    const said = formatTermValue(pay.format, pay.value);
    if (said) out.remuneration = { value: said, source: "deal" };
  }
  // The Réseau's city, when the fiche gives no address.
  if (!out["personne.adresse"] && contact?.city)
    out["personne.adresse"] = { value: contact.city, source: "network" };
  if (company && !out["personne.statut"])
    out["personne.statut"] = {
      value: deals.contractFields.company,
      source: "network",
    };
  for (const term of said) {
    const value = formatTermValue(term.format, term.value);
    if (value) out[dealFieldOf(term.key)] = { value, source: "deal" };
  }
  return out;
}
