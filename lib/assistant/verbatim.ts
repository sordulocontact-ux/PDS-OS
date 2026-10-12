import {
  ISRC_PATTERN,
  normalizeIsrc,
  parseDuration,
} from "@/lib/catalog/types";
import type { AudioState, Variant } from "@/lib/catalog/title-rules";
import { parseEurosToCents } from "@/lib/projects/schemas";

/**
 * Numbers, dates and identifiers in a PO draft (docs/ASSISTANT.md § 3 bis).
 * The model never produces them: it copies what the user wrote, the code
 * checks that the quote is in the user's own messages, then parses it. A
 * quote found nowhere, or that does not parse, leaves the field empty.
 * Transcripts and tool results are never searched: only what was typed or
 * dictated in the conversation.
 */

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s  ]+/g, " ")
    .trim()
    .toLowerCase();

export type Verbatim = {
  /** Null when the quote is not in what the user wrote. */
  quote: (value: string | undefined) => string | null;
  /** The parenthesis written right after `value` (« Zélie Moreau (UX-D) » →
   * « (ux-d) »), folded; null when there is none. A name is copied whole:
   * what follows it is said, never read as something else (a label…). */
  parenthesisAfter: (value: string | undefined) => string | null;
};

export function verbatimFrom(userTexts: string[]): Verbatim {
  const haystack = fold(userTexts.join("\n"));
  return {
    quote(value) {
      const needle = value ? fold(value) : "";
      return needle && haystack.includes(needle) ? value!.trim() : null;
    },
    parenthesisAfter(value) {
      const needle = value ? fold(value) : "";
      const at = needle ? haystack.indexOf(needle) : -1;
      if (at < 0) return null;
      const m = /^ ?(\([^)]{1,40}\))/.exec(haystack.slice(at + needle.length));
      return m ? m[1] : null;
    },
  };
}

const MONTHS = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date.toISOString().slice(0, 10);
}

/**
 * "12/03/2027", "12-03-2027", "2027-03-12", "12 mars 2027", "1er mars 2027"
 * → "2027-03-12". The year is required: the code never guesses it.
 */
export function parseSaidDate(quote: string): string | null {
  const text = fold(quote);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (m) return isoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(?:le )?(\d{1,2})(?:er)? ([a-z]+) (\d{4})$/.exec(text);
  if (m) {
    const month = MONTHS.indexOf(m[2]) + 1;
    return month ? isoDate(Number(m[3]), month, Number(m[1])) : null;
  }
  return null;
}

/** "1 500 €", "1500 euros", "2 000 € HT", "une avance de 2 000 €" → cents:
 * the first amount written. Null otherwise ("5k" included). */
export function parseSaidEuros(quote: string): number | null {
  // A percentage is never an amount.
  if (/%|pour ?cent/i.test(quote) && !/€|euro|\beur\b/i.test(quote))
    return null;
  const m = /\d[\d\s\u00a0\u202f.]*(?:,\d{1,2})?/.exec(quote);
  if (!m) return null;
  // « 5k », « 2 M » : an abbreviation is not read as an amount.
  if (
    /^\s*(?:k|m|md|mds|millions?|milliers?)\b/i.test(
      quote.slice(m.index + m[0].length),
    )
  )
    return null;
  const cents = parseEurosToCents(m[0].replace(/\.(?=\d{3}\b)/g, "").trim());
  return cents ?? null;
}

export function parseSaidIsrc(quote: string): string | null {
  const isrc = normalizeIsrc(quote);
  return isrc && ISRC_PATTERN.test(isrc) ? isrc : null;
}

/** "3:07", "3'07" → "3:07" (the form's own format). */
export function parseSaidDuration(quote: string): string | null {
  const text = quote.trim().replace(/['’]/g, ":");
  return parseDuration(text) ? text : null;
}

export function parseSaidEmail(quote: string): string | null {
  const email = quote.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

export function parseSaidPhone(quote: string): string | null {
  const phone = quote.trim();
  return /^[0-9+(). -]{3,40}$/.test(phone) ? phone : null;
}

/**
 * The audio state named in the user's words: "c'est une maquette" → demo,
 * "la mise à plat" → rough_mix, "le mix" → mix, "master final" → final_master, "master" →
 * master. Null when no state is named.
 */
export function parseSaidAudioState(quote: string): AudioState | null {
  const text = fold(quote);
  if (/master(ise)? final|final master|version finale/.test(text))
    return "final_master";
  if (/mise a plat|rough mix/.test(text)) return "rough_mix";
  if (/\bmix(e|age)?\b|\bmixage\b/.test(text)) return "mix";
  if (/maquette|\bdemo\b/.test(text)) return "demo";
  if (/\bmaster(ise|isee|ing)?\b/.test(text)) return "master";
  return null;
}

/** The variant named in the user's words ("l'instru", "radio edit"…). */
export function parseSaidVariant(quote: string): Variant | null {
  const text = fold(quote);
  if (/radio ?edit/.test(text)) return "radio_edit";
  if (/instru/.test(text)) return "instrumental";
  if (/a ?cc?apella/.test(text)) return "acapella";
  if (/remix/.test(text)) return "remix";
  if (/acousti/.test(text)) return "acoustic";
  if (/\blive\b|en public/.test(text)) return "live";
  if (/original/.test(text)) return "original";
  return null;
}

/**
 * "12 octobre 2026 à 15h30", "12/10/2026 15:30" → "2026-10-12T15:30", the
 * meeting form's datetime-local. Null without a year or without an hour.
 */
export function parseSaidDateTime(quote: string): string | null {
  const m = /^(.*?)\s+(?:a\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/.exec(
    fold(quote),
  );
  if (!m) return null;
  const date = parseSaidDate(m[1]);
  const hour = Number(m[2]);
  const minute = Number(m[3] ?? "0");
  if (!date || hour > 23 || minute > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date}T${pad(hour)}:${pad(minute)}`;
}

/** A web address as typed, http(s) only (the forms refuse anything else). */
export function parseSaidUrl(quote: string): string | null {
  const url = quote.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

/** The state of a spend named in the user's words: "payé", "engagé", "prévu". */
export function parseSaidBudgetStatus(
  quote: string,
): "planned" | "committed" | "paid" | null {
  const text = fold(quote);
  if (/\bpaye(e|s)?\b|regle/.test(text)) return "paid";
  if (/engage|signe|commande/.test(text)) return "committed";
  if (/prevu|estime|previsionnel/.test(text)) return "planned";
  return null;
}
