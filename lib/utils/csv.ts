// CSV as French spreadsheets read it (Excel, Numbers, LibreOffice): « ; »
// between cells, a BOM so the accents survive, CRLF line ends. Shared by
// Finance's « Export comptable » and PO's exports. Client-safe, pure code.

export type CsvCell = string | number | null;

// Euros with a comma, as French spreadsheets read them.
export const csvEuros = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");

export function csv(rows: CsvCell[][]): string {
  const cell = (v: CsvCell) => {
    const s = v === null ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

/** « Titres du catalogue - 2026-11-18.csv », safe for any disk. */
export function csvFileName(name: string, day: string): string {
  const clean = name.replace(/[\\/:*?"<>|]+/g, " ").trim();
  return `${clean} - ${day}.csv`;
}
