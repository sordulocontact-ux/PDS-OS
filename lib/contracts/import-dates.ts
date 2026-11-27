// The dates a dropped contract states (Sacha 26/11/2026): when it starts,
// when it ends, the day it was signed (« Fait à Paris, le 26 novembre
// 2026 »). Read by code from its text, never by a model (rule 6): only a
// date said after words that leave no doubt, else nothing. The end may be
// computed from a duration said in years or months, counted from the start.
// Client-safe and pure; the text is lowercased, without accents.

const FR_MONTHS = [
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
const EN_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// « 1er décembre 2026 », « December 1, 2026 », « 01/12/2026 ».
const DATE = `(?:(\\d{1,2})(?:er)?\\s+(${FR_MONTHS.join("|")})\\s+(\\d{4})|(${EN_MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})|(\\d{1,2})[/.](\\d{1,2})[/.](\\d{4}))`;

const iso = (year: number, month: number, day: number): string | null => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date.toISOString().slice(0, 10);
};

/** The date of a match of DATE, as YYYY-MM-DD; null when not a real day. */
function dateOf(m: RegExpExecArray, at: number): string | null {
  const g = (i: number) => m[at + i];
  if (g(0))
    return iso(Number(g(2)), FR_MONTHS.indexOf(g(1)!) + 1, Number(g(0)));
  if (g(3))
    return iso(Number(g(5)), EN_MONTHS.indexOf(g(3)!) + 1, Number(g(4)));
  return iso(Number(g(8)), Number(g(7)), Number(g(6)));
}

/** The first real date said right after one of `lead`'s words (`last`: the
 * last one). */
function after(text: string, lead: string, last = false): string | null {
  const re = new RegExp(`(?:${lead})\\s*(?:le\\s+|du\\s+|on\\s+)?${DATE}`, "g");
  let found: string | null = null;
  for (const m of text.matchAll(re)) {
    const date = dateOf(m as RegExpExecArray, 1);
    if (!date) continue;
    if (!last) return date;
    found = date;
  }
  return found;
}

/** `start` + a duration, the day before its anniversary (« cinq ans » from
 * the 1st of December 2026 ends on the 30th of November 2031). */
function plus(start: string, count: number, unit: "year" | "month") {
  const [y, m, d] = start.split("-").map(Number);
  const end = new Date(
    Date.UTC(
      y! + (unit === "year" ? count : 0),
      m! - 1 + (unit === "month" ? count : 0),
      d!,
    ),
  );
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

export type ContractDates = {
  startsOn: string | null;
  endsOn: string | null;
  signedOn: string | null;
};

export function contractDates(text: string): ContractDates {
  const startsOn = after(
    text,
    "prend effet|prendra effet|entre en vigueur|entrera en vigueur|a compter du|a partir du|effective as of|effective from|commencing on|with effect from",
  );
  let endsOn = after(
    text,
    "jusqu'au|jusqu’au|prend fin|prendra fin|expire|expirera|until|expires on|terminates on|ending on",
  );
  if (!endsOn && startsOn) {
    // « pour une durée de cinq (5) ans », « for a term of three (3) years ».
    const duration =
      /(?:duree de|duree|term of|period of)\s+(?:[a-z-]+\s+)?\(?(\d{1,2})\)?\s+(ans?|annees?|mois|years?|months?)\b/.exec(
        text,
      );
    if (duration) {
      const unit = /^(mois|month)/.test(duration[2]!) ? "month" : "year";
      endsOn = plus(startsOn, Number(duration[1]), unit);
    }
  }
  // The last « Fait à …, le … »: the signature block is at the end.
  const signedOn = after(text, "fait a\\s+[a-z' -]{1,40},?", true);
  return {
    startsOn,
    endsOn: endsOn && startsOn && endsOn < startsOn ? null : endsOn,
    signedOn,
  };
}
