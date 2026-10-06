// What PDS OS already knows for each field of the bulletin, with where it
// comes from (ticket Juridique 06, « PO préremplit les champs sourcés et
// liste les valeurs manquantes »). Never a first exploitation, never an
// ISWC that is not on the title, never a draft's duration, never the split
// sheet's shares. Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import type { Creator } from "@/lib/legal/formalities/definition";

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
    details: Record<string, string>;
  }>;
};

const QUALITY: Partial<Record<ContributorRole, Creator["quality"]>> = {
  lyricist: "author",
  composer: "composer",
  arranger: "arranger",
};

const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function prefillSacem725(ctx: PrefillContext): Prefill {
  const seen = new Set<string>();
  const creators: Creator[] = ctx.credits.flatMap((c) => {
    const quality = QUALITY[c.role];
    const key = `${c.name}|${quality}`;
    if (!quality || seen.has(key)) return [];
    seen.add(key);
    const d = c.details;
    return [
      {
        last_name: d.legal_last_name || c.name,
        first_name: d.legal_first_name || "",
        pseudonym: d.pseudonym || (d.legal_last_name ? c.name : ""),
        ipi: d.ipi_coad || "",
        quality,
        phono: "",
        signs: true,
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
  };
}
