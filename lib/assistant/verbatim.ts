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
};

export function verbatimFrom(userTexts: string[]): Verbatim {
  const haystack = fold(userTexts.join("\n"));
  return {
    quote(value) {
      const needle = value ? fold(value) : "";
      return needle && haystack.includes(needle) ? value!.trim() : null;
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

/** "1 500 €", "1500 euros", "1 500,50" → cents. Null otherwise ("5k" included). */
export function parseSaidEuros(quote: string): number | null {
  const cents = parseEurosToCents(
    quote.replace(/\s*(euros?|eur)\s*$/i, "").trim(),
  );
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
 * "la mise à plat" → rough_mix, "master final" → final_master, "master" →
 * master. Null when no state is named.
 */
export function parseSaidAudioState(quote: string): AudioState | null {
  const text = fold(quote);
  if (/master(ise)? final|final master|version finale/.test(text))
    return "final_master";
  if (/mise a plat|rough mix/.test(text)) return "rough_mix";
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
  if (/original/.test(text)) return "original";
  return null;
}
