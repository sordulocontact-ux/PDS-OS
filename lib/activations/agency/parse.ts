import "server-only";

import readXlsxFile from "read-excel-file/node";

import {
  NUMERIC_FIELDS,
  URL_FIELDS,
  normalizeHeader,
  type AgencyField,
} from "@/lib/activations/agency/fields";

export type ParsedRow = {
  key: string;
  position: number;
  raw: Record<string, string>;
  mapped: Record<string, string | number>;
  errors: string[];
};

export type ParsedTable = { headers: string[]; rows: string[][] };

const CELL_ERROR =
  /^#(REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!|SPILL!)/i;

/** CSV text → rows, quotes and line breaks inside quotes handled ; the
 * delimiter (« , » or « ; ») read from the first line. */
export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** The first non-empty row is the header ; the rest are the data rows. */
export function toTable(rows: string[][]): ParsedTable {
  const filled = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const [header, ...data] = filled;
  const headers = (header ?? []).map((h, i) => h.trim() || `Colonne ${i + 1}`);
  return { headers, rows: data };
}

/** An Excel workbook : the tab named like the source (« Djuno »), else the
 * first one. Cells are read as text, as the agency wrote them. */
export async function readWorkbook(
  buffer: Buffer,
  sheetName: string,
): Promise<ParsedTable> {
  const sheets = await readXlsxFile(buffer);
  const wanted = normalizeHeader(sheetName);
  const sheet =
    sheets.find((s) => normalizeHeader(s.sheet) === wanted) ?? sheets[0];
  const rows = (sheet?.data ?? []).map((r) =>
    r.map((c) =>
      c === null
        ? ""
        : c instanceof Date
          ? c.toISOString().slice(0, 10)
          : String(c),
    ),
  );
  return toTable(rows);
}

/** « 1,2 k », « 328 000 », « 12,5 % » → a number ; text → null. */
export function toNumber(value: string): number | null {
  const v = value
    .replace(/\s| |%/g, "")
    .replace(",", ".")
    .toLowerCase();
  const m = /^(\d+(?:\.\d+)?)(k|m)?$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
}

/** The upper bound a category label states (« Micro (10k-100k) »). */
function categoryCeiling(label: string): number | null {
  const m =
    /(\d+(?:[.,]\d+)?)\s*(k|m)?\s*[-–à]\s*(\d+(?:[.,]\d+)?)\s*(k|m)/i.exec(
      label,
    );
  return m ? toNumber(`${m[3]}${m[4]}`) : null;
}

const keyPart = (v: string | number | undefined) =>
  v === undefined ? "" : normalizeHeader(String(v)).replace(/^@/, "");

/**
 * Each data row mapped to the fields, with what is wrong in it, never fixed
 * (« PO ne corrige pas silencieusement une catégorie, un statut ou une
 * valeur d'agence ») : cell errors, text in a number, an invalid link, a
 * category whose own ceiling the audience passes. A row without its key
 * fields cannot be followed : reported, not imported.
 */
export function mapRows(
  table: ParsedTable,
  mapping: Record<string, string>,
  keyFields: readonly string[],
  messages: {
    cellError: (column: string, value: string) => string;
    notNumber: (column: string, value: string) => string;
    badUrl: (column: string) => string;
    category: (label: string, followers: number) => string;
  },
): { rows: ParsedRow[]; skipped: number[] } {
  const index = new Map(table.headers.map((h, i) => [h, i]));
  const rows: ParsedRow[] = [];
  const skipped: number[] = [];
  const seen = new Map<string, number>();
  table.rows.forEach((cells, i) => {
    const position = i + 2;
    const raw = Object.fromEntries(
      table.headers.map((h, j) => [h, (cells[j] ?? "").trim()]),
    );
    const mapped: Record<string, string | number> = {};
    const errors: string[] = [];
    for (const [field, header] of Object.entries(mapping)) {
      const value = (cells[index.get(header) ?? -1] ?? "").trim();
      if (!value) continue;
      if (CELL_ERROR.test(value)) {
        errors.push(messages.cellError(header, value));
        continue;
      }
      if (NUMERIC_FIELDS.includes(field as AgencyField)) {
        const n = toNumber(value);
        if (n === null) errors.push(messages.notNumber(header, value));
        else mapped[field] = n;
      } else if (
        URL_FIELDS.includes(field as AgencyField) &&
        !/^https?:\/\/\S+$/.test(value)
      ) {
        errors.push(messages.badUrl(header));
        mapped[field] = value;
      } else mapped[field] = value;
    }
    const ceiling =
      typeof mapped.category === "string"
        ? categoryCeiling(mapped.category)
        : null;
    if (
      ceiling !== null &&
      typeof mapped.followers === "number" &&
      mapped.followers > ceiling
    )
      errors.push(messages.category(String(mapped.category), mapped.followers));
    const parts = keyFields.map((f) => keyPart(mapped[f])).filter(Boolean);
    if (parts.length === 0) {
      if (Object.keys(mapped).length > 0) skipped.push(position);
      return;
    }
    let key = parts.join("|");
    // Two rows with the same key stay two rows : the second is numbered.
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) key = `${key}#${n}`;
    rows.push({ key, position, raw, mapped, errors });
  });
  return { rows, skipped };
}
