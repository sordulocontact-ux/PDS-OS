// « Saisie ou import ligne par ligne » (Ibé's ticket, budget Dioo): a
// table pasted from a spreadsheet (or a .csv), one spend per row, read
// here before anything is written. Client-safe, pure code.

import {
  BUDGET_FAMILIES,
  type BudgetFamily,
  type BudgetStatus,
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { parseEurosToCents } from "@/lib/projects/schemas";

export type ImportRow = {
  line: number;
  label: string;
  family: BudgetFamily | null;
  // What « Autre » is, when the poste read is none of PDS OS's.
  familyDetail: string | null;
  subpost: string | null;
  cents: number;
  supplier: string | null;
  dueOn: string | null;
  status: BudgetStatus;
};

export type ImportProblem = {
  line: number;
  problem: "label" | "amount" | "day";
};

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// The columns, by the words a spreadsheet's header uses.
const COLUMNS = {
  label: ["libelle", "ligne", "intitule", "designation", "depense"],
  family: ["poste", "categorie", "famille"],
  subpost: ["sous poste", "sous categorie", "detail"],
  amount: ["montant", "montant ht", "budget", "prevu", "previsionnel", "ht"],
  supplier: ["fournisseur", "prestataire", "tiers"],
  dueOn: ["echeance", "date", "date prevue"],
  status: ["statut", "etat"],
} as const;
type Column = keyof typeof COLUMNS;

const STATUS_WORDS: [string[], BudgetStatus][] = [
  [["paye", "payee", "regle"], "paid"],
  [["facture", "facturee"], "invoiced"],
  [["commande", "commandee", "engage", "engagee", "signe"], "committed"],
  [["devis", "propose"], "proposed"],
];

const FAMILY_BY_LABEL = new Map(
  BUDGET_FAMILIES.map((f) => [fold(budget.families[f]), f] as const),
);

function familyOf(value: string): Pick<ImportRow, "family" | "familyDetail"> {
  const key = fold(value);
  if (!key) return { family: null, familyDetail: null };
  const exact = FAMILY_BY_LABEL.get(key);
  if (exact) return { family: exact, familyDetail: null };
  const near = [...FAMILY_BY_LABEL].find(
    ([label]) => label.includes(key) || key.includes(label),
  );
  if (near) return { family: near[1], familyDetail: null };
  return { family: "other", familyDetail: value.trim().slice(0, 120) };
}

function dayOf(value: string): string | null | undefined {
  const v = value.trim();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return v;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(v);
  if (!fr) return undefined;
  const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
  return `${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
}

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

/**
 * The rows of a pasted table: tab (a spreadsheet's copy), « ; » or « , »
 * separated, a header row naming the columns (else Libellé, Poste,
 * Montant in that order). Every row with neither label nor amount is
 * skipped; the others are kept or said wrong, never guessed.
 */
export function parseBudgetImport(text: string): {
  rows: ImportRow[];
  problems: ImportProblem[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], problems: [] };
  const separator = ["\t", ";", ","].find((s) => lines[0].includes(s)) ?? ";";
  const head = cells(lines[0], separator).map(fold);
  const index: Partial<Record<Column, number>> = {};
  for (const column of Object.keys(COLUMNS) as Column[]) {
    const at = head.findIndex((h) =>
      (COLUMNS[column] as readonly string[]).includes(h),
    );
    if (at >= 0) index[column] = at;
  }
  const hasHeader = index.label !== undefined || index.amount !== undefined;
  if (!hasHeader) Object.assign(index, { label: 0, family: 1, amount: 2 });
  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  lines.slice(hasHeader ? 1 : 0).forEach((raw, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const c = cells(raw, separator);
    const get = (column: Column) =>
      index[column] === undefined ? "" : (c[index[column]] ?? "");
    const label = get("label").slice(0, 200);
    const amount = get("amount").replace(/€|eur/gi, "").trim();
    if (!label && !amount) return;
    const cents = parseEurosToCents(amount);
    const dueOn = dayOf(get("dueOn"));
    if (!label) return problems.push({ line, problem: "label" });
    if (cents === null || cents === undefined || cents < 0)
      return problems.push({ line, problem: "amount" });
    if (dueOn === undefined) return problems.push({ line, problem: "day" });
    const status = fold(get("status"));
    rows.push({
      line,
      label,
      ...familyOf(get("family")),
      subpost: get("subpost").slice(0, 120) || null,
      cents,
      supplier: get("supplier").slice(0, 200) || null,
      dueOn,
      status:
        STATUS_WORDS.find(([words]) => words.includes(status))?.[1] ??
        "planned",
    });
  });
  return { rows, problems };
}
