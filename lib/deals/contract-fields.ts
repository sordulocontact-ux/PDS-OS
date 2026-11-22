import "server-only";

import { dealFieldOf, type FieldSource } from "@/lib/legal/contracts/fields";
import { loadDealMemos } from "@/lib/deals/memo-queries";
import { formatTermValue } from "@/lib/deals/term-format";
import { loadDealTerms } from "@/lib/deals/term-queries";
import type { Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";
import { createClient } from "@/lib/supabase/server";

export type DealFieldValue = { value: string; source: FieldSource };

/**
 * What the deal already knows of a contract template's fields (Sacha
 * 22/11/2026, « que PDS OS puisse créer le contrat »), read by code, shown
 * prefilled and correctable before the contract is generated: the terms of
 * its validated deal memo (else its terms now) as {{deal.<term>}}, the
 * remuneration from its advance, fee or minimum guarantee, its project and
 * artist, its label or brand (else its artist's contact) from the Réseau,
 * the organization's name. A value it does not know stays empty for a
 * person to type.
 */
export async function dealFieldValues(
  deal: Deal,
  organizationName: string | null,
): Promise<Record<string, DealFieldValue>> {
  const supabase = await createClient();
  const [memos, terms, { data: contact }] = await Promise.all([
    loadDealMemos(deal.id, deal.kind),
    loadDealTerms(deal.id, deal.kind),
    deal.counterpartId
      ? supabase
          .from("network_contacts")
          .select("kind, name, email, phone, city")
          .eq("id", deal.counterpartId)
          .maybeSingle()
      : deal.artistId
        ? supabase
            .from("network_contacts")
            .select("kind, name, email, phone, city")
            .eq("artist_id", deal.artistId)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
  ]);
  const out: Record<string, DealFieldValue> = {};
  const put = (
    id: string,
    value: string | null | undefined,
    source: FieldSource,
  ) => {
    const clean = value?.trim();
    if (clean) out[id] = { value: clean, source };
  };

  const validated = memos.find((m) => m.status === "validated");
  const said = validated
    ? validated.terms
    : terms.filter((t) => t.state !== "to_define");
  for (const term of said)
    put(
      dealFieldOf(term.key),
      formatTermValue(term.format, term.value),
      "deal",
    );
  const pay = ["advance", "fee", "minimum_guarantee"]
    .map((key) => out[dealFieldOf(key)])
    .find(Boolean);
  if (pay) out.remuneration = pay;

  put("projet.titre", deal.projectTitle ?? deal.titleLabel, "project");
  put("projet.artiste", deal.artistName, "project");
  put("projet.titres", deal.titleLabel, "project");
  put("organisation.nom", organizationName, "organization");

  if (contact) {
    const company = contact.kind === "organization";
    put(
      company ? "personne.societe" : "personne.nom_civil",
      contact.name,
      "network",
    );
    put("personne.email", contact.email, "network");
    put("personne.telephone", contact.phone, "network");
    put("personne.adresse", contact.city, "network");
    put(
      "personne.statut",
      company ? deals.contractFields.company : deals.contractFields.person,
      "network",
    );
  }
  if (deal.artistName) put("personne.nom_artiste", deal.artistName, "project");
  return out;
}
