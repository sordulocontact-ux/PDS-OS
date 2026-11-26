// What a dropped contract says of itself (Sacha 26/11/2026: the file first,
// the form filled from it): its title, its kind, the artist and the project
// it names. Read by code from the file's text, never by a model (rule 6),
// each value corrigible in the form. Client-safe and pure.

import type { ContractType } from "@/lib/contracts/types";

// A PDF or a Word document (Sacha 23/11/2026: « importer des docs »).
export const CONTRACT_FILE_ACCEPT =
  "application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx";

export type ContractPrefill = {
  title: string;
  type: ContractType;
  artistId: string | null;
  projectId: string | null;
};

// The words of each kind, the most specific first: « licence » before
// « artiste », a licence often naming its artist.
const KINDS: Array<[ContractType, RegExp]> = [
  // Matched on the text without accents (`plain`).
  ["image_rights", /droits? a l['’]image/],
  ["coproduction", /co-?production/],
  ["publishing", /\b(?:edition|editeur|cession (?:et|d['’])|publishing)/],
  ["license", /\blicen[cs]e\b/],
  ["distribution", /\bdistribution\b/],
  ["partnership", /\b(?:partenariat|partnership)\b/],
  ["service", /\b(?:prestation|prestataire|services? agreement)\b/],
  [
    "artist",
    /\b(?:artiste|enregistrement exclusif|interprete|recording agreement|artist agreement)\b/,
  ],
];

// A title starts with what the document is (French or English), never in
// the middle of a sentence (« … d'un contrat que … »).
const TITLE_LINE =
  /^(?:le |la |l['’]|the )?(?:contrat|convention|accord|licence|license|cession|avenant|agreement|amendment|deal memo)\b/i;

const plain = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** « CONTRAT DE LICENCE » → « Contrat de licence ». */
function sentenceCase(line: string): string {
  if (line !== line.toUpperCase()) return line;
  const lower = line.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Its title: the first of its first lines that names a contract, else the
 * file's name without its extension. */
function titleOf(text: string, fileName: string): string {
  const line = text
    .split("\n")
    .slice(0, 15)
    .map((l) =>
      l
        .replace(/[*_#]/g, "")
        .replace(/[\s:;,.]+$/, "")
        .trim(),
    )
    .find((l) => l.length >= 6 && l.length <= 120 && TITLE_LINE.test(l));
  const fromFile = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  const title = line ? sentenceCase(line) : fromFile;
  return (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 200);
}

// « PDS Records », « Wagram Music », « Nova Sound SAS »: a name followed by
// one of these is a company, not the artist (a memo addressed to the label).
const COMPANY_AFTER =
  "(?!\\s+(?:records|music|musique|label|editions|publishing|productions?|entertainment|sas|sarl|sa|inc|ltd|llc|gmbh)\\b)";

/** The one option whose name the text contains, else null (none, or
 * several: nothing is guessed). */
function namedIn<T extends { id: string }>(
  text: string,
  items: T[],
  nameOf: (item: T) => string,
): string | null {
  const found = items.filter((item) => {
    const name = plain(nameOf(item)).trim();
    if (name.length < 3) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(?:^|[^a-z0-9])${escaped}${COMPANY_AFTER}(?:$|[^a-z0-9])`,
    ).test(text);
  });
  return found.length === 1 ? found[0]!.id : null;
}

export function contractPrefill(
  text: string | null,
  fileName: string,
  options: {
    artists: Array<{ id: string; name: string }>;
    projects: Array<{ id: string; title: string }>;
  },
): ContractPrefill {
  const body = text ?? "";
  const title = titleOf(body, fileName);
  const words = plain(`${title}\n${body.slice(0, 4000)}`);
  // The title decides first; the opening of the text otherwise.
  const kind =
    KINDS.find(([, re]) => re.test(plain(title))) ??
    KINDS.find(([, re]) => re.test(words));
  const all = plain(body);
  return {
    title,
    type: kind?.[0] ?? "other",
    artistId: namedIn(all, options.artists, (a) => a.name),
    projectId: namedIn(all, options.projects, (p) => p.title),
  };
}
