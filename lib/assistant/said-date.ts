// A date (and hour) said in French, resolved by code against today (UX test
// of 09/10/2026: « vendredi » not understood, « mardi 13 octobre 2026 à 10h »
// dropped, then a meeting prefilled at a plausible but wrong hour). The model
// only copies the user's words (lib/assistant/verbatim.ts checks them);
// today never enters its context, the code reads it here (rule 6,
// docs/ASSISTANT.md § 3 bis). Pure and client-safe.

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
// getUTCDay() order.
const WEEKDAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  quinze: 15,
};

export type SaidDate = {
  // "2026-10-16".
  date: string;
  // "10:00", or null when no hour was said.
  time: string | null;
};

export type SaidDateResult =
  | ({ ok: true } & SaidDate)
  // « en mars », « début mars », « la semaine prochaine »: no day to put in
  // a date field, never completed by the code.
  | { ok: false; error: "vague" }
  // « mardi 14 octobre » while the 14th is a Wednesday.
  | { ok: false; error: "weekday_mismatch" }
  | { ok: false; error: "unparsed" };

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[\s  ,]+/g, " ")
    .trim()
    .toLowerCase();

const pad = (n: number) => String(n).padStart(2, "0");

function utc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const isoOf = (date: Date) => date.toISOString().slice(0, 10);

function addDays(iso: string, days: number): string {
  const date = utc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return isoOf(date);
}

function validDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? isoOf(date)
    : null;
}

/** The next date with this day and month, today included, when no year is said. */
function nextOccurrence(today: string, month: number, day: number) {
  const year = Number(today.slice(0, 4));
  const thisYear = validDate(year, month, day);
  if (thisYear && thisYear >= today) return thisYear;
  return validDate(year + 1, month, day);
}

// « à 10h », « 10 h 30 », « 14:15 », « midi »: [rest of the text, "HH:MM"].
function splitTime(text: string): [string, string | null] | null {
  if (/\bmidi\b/.test(text))
    return [text.replace(/\b(?:a )?midi\b/, " ").trim(), "12:00"];
  const m = /(?:^|\s)(?:a |vers )?(\d{1,2}) ?(?:h|:) ?(\d{2})?(?=\s|$)/.exec(
    text,
  );
  if (!m) return [text, null];
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? "0");
  if (hour > 23 || minute > 59) return null;
  return [
    (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)).trim(),
    `${pad(hour)}:${pad(minute)}`,
  ];
}

function count(word: string): number | null {
  if (/^\d{1,3}$/.test(word)) return Number(word);
  return NUMBER_WORDS[word] ?? null;
}

function resolveDay(rest: string, today: string): SaidDateResult | string {
  const text = rest
    .replace(
      /^(?:le|pour|avant|d ici|jusqu au|au plus tard|des|a partir du)\s+/,
      "",
    )
    .replace(/^le\s+/, "")
    .trim();
  if (text === "") return { ok: false, error: "unparsed" };

  if (/^(?:aujourd hui|ce soir|ce matin|cet apres midi|ce midi)$/.test(text))
    return today;
  if (text === "demain" || /^demain (?:matin|soir|apres midi)$/.test(text))
    return addDays(today, 1);
  if (/^apres(?: |-)demain$/.test(text)) return addDays(today, 2);

  let m = /^dans (\S+) (jours?|semaines?)$/.exec(text);
  if (m) {
    const n = count(m[1]);
    if (n === null) return { ok: false, error: "unparsed" };
    return addDays(today, m[2].startsWith("jour") ? n : n * 7);
  }

  // « vendredi », « vendredi prochain », « vendredi en huit ».
  m = new RegExp(`^(${WEEKDAYS.join("|")})(?: (prochain|en huit))?$`).exec(
    text,
  );
  if (m) {
    const target = WEEKDAYS.indexOf(m[1]);
    const current = utc(today).getUTCDay();
    const ahead = (target - current + 7) % 7 || 7;
    return addDays(today, ahead + (m[2] === "en huit" ? 7 : 0));
  }

  // « mardi 13 octobre 2026 », « 13 octobre », « 1er mars ».
  m = new RegExp(
    `^(?:(${WEEKDAYS.join("|")}) )?(\\d{1,2})(?:er)? (${MONTHS.join("|")})(?: (\\d{4}))?$`,
  ).exec(text);
  if (m) {
    const month = MONTHS.indexOf(m[3]) + 1;
    const day = Number(m[2]);
    const date = m[4]
      ? validDate(Number(m[4]), month, day)
      : nextOccurrence(today, month, day);
    if (!date) return { ok: false, error: "unparsed" };
    if (m[1] && utc(date).getUTCDay() !== WEEKDAYS.indexOf(m[1]))
      return { ok: false, error: "weekday_mismatch" };
    return date;
  }

  // « 13/10/2026 », « 13/10 », « 2026-10-13 ».
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m)
    return (
      validDate(Number(m[1]), Number(m[2]), Number(m[3])) ?? {
        ok: false,
        error: "unparsed",
      }
    );
  m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/.exec(text);
  if (m) {
    const date = m[3]
      ? validDate(Number(m[3]), Number(m[2]), Number(m[1]))
      : nextOccurrence(today, Number(m[2]), Number(m[1]));
    return date ?? { ok: false, error: "unparsed" };
  }

  // A month or a week without a day: said, but not a date.
  if (
    new RegExp(
      `^(?:en |debut |fin |mi |courant |vers )?(?:${MONTHS.join("|")})(?: \\d{4})?$`,
    ).test(text) ||
    /^(?:la |cette )?(?:semaine|fin de semaine|fin du mois|mois) ?(?:prochaine?)?$/.test(
      text,
    )
  )
    return { ok: false, error: "vague" };
  return { ok: false, error: "unparsed" };
}

/** A date said in the user's words, resolved against `today` ("2026-10-10",
 * Europe/Paris, read by the caller). */
export function resolveSaidDate(quote: string, today: string): SaidDateResult {
  const split = splitTime(fold(quote));
  if (!split) return { ok: false, error: "unparsed" };
  const [rest, time] = split;
  const day = resolveDay(rest, today);
  return typeof day === "string" ? { ok: true, date: day, time } : day;
}
