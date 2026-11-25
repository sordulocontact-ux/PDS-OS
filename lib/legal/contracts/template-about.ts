// What a contract says of itself, read by the code from its text (Sacha
// 25/11/2026: « qu'il pré-remplisse aussi ces informations »): its title as
// the template's name, the type its title names, the roles that type is
// signed by, its language. Only what is written: no title, no type. PO adds
// what is left empty (the usage, the roles of another type). Client-safe.

import type { ContractType } from "@/lib/contracts/types";
import type { ContractLanguage } from "@/lib/legal/contracts/language";
import type { FormRole } from "@/lib/legal/forms/definition";

export type AboutFromText = {
  name: string | null;
  type: ContractType | null;
  roles: FormRole[];
  language: ContractLanguage;
};

// The words of a title, in the order they are tried: « cession de droit à
// l'image » before « cession ».
const TYPES: Array<[RegExp, ContractType]> = [
  [/droit\s+à\s+l['’]image|image\s+rights/i, "image_rights"],
  [/coproduction|co-production/i, "coproduction"],
  [/distribution/i, "distribution"],
  [/licen[cs]e/i, "license"],
  [/[ée]dition|publishing|cession\s+de\s+droits?\s+d['’]auteur/i, "publishing"],
  [/artiste|enregistrement|recording\s+agreement|artist/i, "artist"],
  [/prestation|mixage|mastering|r[ée]alisation|services?/i, "service"],
  [/partenariat|partnership|sponsoring/i, "partnership"],
];

// Who signs a contract of that type, when the type says it.
const ROLES: Partial<Record<ContractType, FormRole[]>> = {
  artist: ["performer"],
  publishing: ["author", "composer"],
  license: ["label"],
  coproduction: ["producer"],
  service: ["provider"],
};

const FRENCH = /\b(le|la|les|des|du|et|est|pour|dans|sur|par|une|qui|que)\b/gi;
const ENGLISH = /\b(the|and|of|to|is|for|in|on|by|shall|which|that|this)\b/gi;

/** French or English, by their most common words. */
export function languageOf(text: string): ContractLanguage {
  const sample = text.slice(0, 20_000);
  const fr = sample.match(FRENCH)?.length ?? 0;
  const en = sample.match(ENGLISH)?.length ?? 0;
  return en > fr * 1.5 ? "en" : "fr";
}

/** The title: the first line, when it reads as one — short, in capitals
 * or in bold (« **CONTRAT D'ARTISTE** » → « Contrat d'artiste »); a date
 * or a letter's address is not a title. */
function titleOf(text: string): string | null {
  const raw = text
    .split("\n")
    .find((line) => line.trim())
    ?.trim();
  if (!raw) return null;
  const first = raw.replace(/\*\*|__/g, "").trim();
  const bold = /^\*\*[^*]+\*\*$/.test(raw);
  const capitals =
    /\p{Lu}{3}/u.test(first) && first === first.toLocaleUpperCase("fr-FR");
  if (first.length > 90 || /[.;]$/.test(first) || !(bold || capitals))
    return null;
  return capitals
    ? first.charAt(0) + first.slice(1).toLocaleLowerCase("fr-FR")
    : first;
}

export function aboutFromText(text: string): AboutFromText {
  const name = titleOf(text);
  const type = name
    ? (TYPES.find(([words]) => words.test(name))?.[1] ?? null)
    : null;
  return {
    name,
    type,
    roles: type ? (ROLES[type] ?? []) : [],
    language: languageOf(text),
  };
}
