// What PDS OS already knows for each field of the bulletin, with where it
// comes from (ticket Juridique 06, « PO préremplit les champs sourcés et
// liste les valeurs manquantes »). Never an ISWC that is not on the title,
// never a draft's duration. The first exploitation is proposed from the
// planned release (recette Juridique V1, JUR-02), « Proposé » until a person
// confirms it. The Phono shares
// start from the title's confirmed split (UX test of 09/10/2026, decided
// with Sacha on 10/10: they were retyped right after the confirmation),
// matched by contact, never by name, and shown « à vérifier ». A signed
// publishing contract of the project ticks « copie jointe » (also done in
// SQL when the contract is signed later: contracts_tick_formalities). Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import {
  QUALITY_OF_ROLE,
  creatorIdentity,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";

export type Prefill = Record<
  string,
  { value: unknown; source: string } | undefined
>;

// A line of the title's confirmed split: exact share, « 33.3334 ».
export type SplitShare = {
  contactId: string | null;
  role: string;
  share: string;
};

export type PrefillContext = {
  title: string;
  durationSeconds: number | null;
  audioState: string | null;
  iswc: string | null;
  performers: string[];
  credits: Array<{
    name: string;
    role: ContributorRole;
    contactId: string | null;
    details: Record<string, string>;
  }>;
  // The publishers of the title's publishing split (their name, never their
  // share), with their contact and fiche when linked.
  publishers: Array<{
    name: string;
    contactId: string | null;
    details: Record<string, string>;
  }>;
  // The project's signed publishing contract, by its title, if there is one.
  signedPublishingContract: string | null;
  // The title's confirmed split, if there is one.
  splitShares: SplitShare[] | null;
  // The project's planned release day, « 2026-12-05 ».
  releaseDate: string | null;
};

// The share of a person in the confirmed split: the line of their contact
// with this role, else their only line. Never by name.
export function splitShareOf(
  shares: SplitShare[] | null,
  contactId: string | null,
  role: string,
): string {
  if (!shares || !contactId) return "";
  const own = shares.filter((s) => s.contactId === contactId);
  return (
    (own.find((s) => s.role === role) ?? (own.length === 1 ? own[0] : null))
      ?.share ?? ""
  );
}

const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function prefillSacem725(ctx: PrefillContext): Prefill {
  const seen = new Set<string>();
  const creators: Creator[] = ctx.credits.flatMap((c) => {
    const quality = QUALITY_OF_ROLE[c.role];
    const key = `${c.contactId ?? c.name}|${quality}`;
    if (!quality || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        ...creatorIdentity(c.name, c.details),
        quality,
        phono: splitShareOf(ctx.splitShares, c.contactId, quality),
        signs: true,
        ...(c.contactId ? { contact_id: c.contactId } : {}),
      },
    ];
  });
  const named = new Set<string>();
  const publishers: Publisher[] = ctx.publishers.flatMap((p) => {
    const key = p.contactId ?? p.name;
    if (named.has(key)) return [];
    named.add(key);
    return [
      {
        name: p.name,
        ipi: p.details.ipi_coad || "",
        phono: splitShareOf(ctx.splitShares, p.contactId, "publisher"),
        ...(p.contactId ? { contact_id: p.contactId } : {}),
      },
    ];
  });
  return {
    title: { value: ctx.title, source: "Titre" },
    duration:
      ctx.durationSeconds && ctx.audioState === "final_master"
        ? { value: minutes(ctx.durationSeconds), source: "Master final" }
        : undefined,
    iswc: ctx.iswc ? { value: ctx.iswc, source: "Titre" } : undefined,
    first_exploitation: ctx.releaseDate
      ? { value: ctx.releaseDate, source: "Date de sortie prévue" }
      : undefined,
    performers:
      ctx.performers.length > 0
        ? { value: ctx.performers.join(", "), source: "Artistes du titre" }
        : undefined,
    creators:
      creators.length > 0
        ? { value: creators, source: "Crédits et fiches de renseignements" }
        : undefined,
    // Not a field of the bulletin: says the shares came from the split.
    phono_from_split:
      ctx.splitShares && [...creators, ...publishers].some((p) => p.phono)
        ? { value: true, source: "Répartition confirmée" }
        : undefined,
    publishers:
      publishers.length > 0
        ? { value: publishers.slice(0, 3), source: "Répartition de l'édition" }
        : undefined,
    publishing_contract: ctx.signedPublishingContract
      ? {
          value: { provided: true, rubric_g: "" },
          // Same words as the SQL trigger.
          source: `Contrat signé : ${ctx.signedPublishingContract}`.slice(
            0,
            200,
          ),
        }
      : undefined,
  };
}
