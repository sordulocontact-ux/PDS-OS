// « Import CSV » of the bank (Qonto's export, or any bank's): one
// transaction per row, read here before anything is written. Client-safe,
// pure code.

import { parseEurosToCents } from "@/lib/projects/schemas";

export type BankRow = {
  line: number;
  bookedOn: string;
  // Signed: money in > 0, money out < 0.
  cents: number;
  counterparty: string | null;
  reference: string | null;
  label: string | null;
  externalId: string | null;
};

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// The columns, by the words Qonto's export (FR or EN) and other banks use.
const COLUMNS = {
  date: [
    "settlement date",
    "date de la valeur",
    "date de valeur",
    "operation date",
    "date de l operation",
    "date",
  ],
  amount: ["total amount", "montant total", "amount", "montant"],
  debit: ["debit"],
  credit: ["credit"],
  counterparty: [
    "counterparty name",
    "nom de la contrepartie",
    "contrepartie",
    "tiers",
    "beneficiaire",
  ],
  reference: ["reference", "ref"],
  label: ["label", "libelle", "description", "note"],
  id: ["transaction id", "id de la transaction", "id"],
} as const;
type Column = keyof typeof COLUMNS;

function cells(line: string, separator: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === separator && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function dayOf(value: string): string | null {
  const v = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(v);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return null;
}

function signedCents(value: string): number | null {
  const v = value.replace(/€|eur/gi, "").replace(/\s/g, "").trim();
  if (!v) return null;
  const negative = v.startsWith("-");
  const cents = parseEurosToCents(v.replace(/^[-+]/, ""));
  if (cents === null || cents === undefined) return null;
  return negative ? -cents : cents;
}

/**
 * The transactions of a bank export: separator « ; » or « , » (or tab),
 * a header naming the columns; the amount signed, or split in debit and
 * credit. A row without a day or an amount is said, never guessed.
 */
export function parseBankImport(text: string): {
  rows: BankRow[];
  problems: number[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], problems: [] };
  const separator = ["\t", ";", ","].find((s) => lines[0].includes(s)) ?? ";";
  const head = cells(lines[0], separator).map(fold);
  const index: Partial<Record<Column, number>> = {};
  for (const column of Object.keys(COLUMNS) as Column[]) {
    for (const word of COLUMNS[column]) {
      const at = head.findIndex((h) => h === word);
      if (at >= 0 && !Object.values(index).includes(at)) {
        index[column] = at;
        break;
      }
    }
  }
  const rows: BankRow[] = [];
  const problems: number[] = [];
  lines.slice(1).forEach((raw, i) => {
    const line = i + 2;
    const c = cells(raw, separator);
    const get = (column: Column) =>
      index[column] === undefined ? "" : (c[index[column]] ?? "");
    const bookedOn = dayOf(get("date"));
    let cents = signedCents(get("amount"));
    if (cents === null) {
      const credit = signedCents(get("credit"));
      const debit = signedCents(get("debit"));
      cents = credit ? Math.abs(credit) : debit ? -Math.abs(debit) : null;
    }
    if (!bookedOn || !cents) {
      problems.push(line);
      return;
    }
    const text = (column: Column, max: number) =>
      get(column).slice(0, max) || null;
    rows.push({
      line,
      bookedOn,
      cents,
      counterparty: text("counterparty", 200),
      reference: text("reference", 300),
      label: text("label", 300),
      externalId: text("id", 120),
    });
  });
  return { rows, problems };
}
