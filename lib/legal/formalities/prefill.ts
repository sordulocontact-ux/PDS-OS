// What PDS OS already knows for each field of the bulletin, with where it
// comes from (ticket Juridique 06, « PO préremplit les champs sourcés et
// liste les valeurs manquantes »). Never a first exploitation, never an
// ISWC that is not on the title, never a draft's duration, never the split
// sheet's shares. A signed publishing contract of the project ticks « copie
// jointe » (also done in SQL when the contract is signed later:
// contracts_tick_formalities). Pure.

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
};

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
        phono: "",
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
        phono: "",
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
    performers:
      ctx.performers.length > 0
        ? { value: ctx.performers.join(", "), source: "Artistes du titre" }
        : undefined,
    creators:
      creators.length > 0
        ? { value: creators, source: "Crédits et fiches de renseignements" }
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
