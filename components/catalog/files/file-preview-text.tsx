"use client";

import { useEffect, useState } from "react";

import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import {
  columnLetter,
  parseCsv,
  PREVIEW_MAX_COLUMNS,
  readTextHead,
} from "@/lib/catalog/text-preview";
import { cn } from "@/lib/utils";

const fr = { catalogFiles };

type Read =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "text"; text: string; cut: boolean }
  | { state: "csv"; rows: string[][]; cut: boolean };

/**
 * A text file read from its signed URL and shown as is, or a CSV drawn as a
 * spreadsheet (column letters, numbered rows), as Accordee does. Only its
 * start is read (lib/catalog/text-preview.ts); the rest is a download away.
 * Mounted again for each file (its parent's key), so it starts loading.
 */
export function FilePreviewText({ url, csv }: { url: string; csv: boolean }) {
  const t = fr.catalogFiles.preview;
  const [read, setRead] = useState<Read>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    readTextHead(url, controller.signal).then(
      ({ text, cut }) =>
        setRead(
          csv
            ? { state: "csv", ...parseCsv(text, { partial: cut }) }
            : { state: "text", text, cut },
        ),
      () => !controller.signal.aborted && setRead({ state: "failed" }),
    );
    return () => controller.abort();
  }, [url, csv]);

  if (read.state === "loading" || read.state === "failed")
    return (
      <p
        role={read.state === "failed" ? "alert" : "status"}
        className="m-auto p-6 text-[color:var(--text-secondary)]"
      >
        {read.state === "failed" ? t.failed : t.loading}
      </p>
    );
  const empty =
    read.state === "text" ? read.text.trim() === "" : read.rows.length === 0;
  if (empty)
    return (
      <p className="m-auto p-6 text-[color:var(--text-secondary)]">{t.empty}</p>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {read.state === "text" ? (
          <pre className="mx-auto min-h-full max-w-4xl bg-card p-6 font-mono text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] break-words whitespace-pre-wrap">
            {read.text}
          </pre>
        ) : (
          <Sheet rows={read.rows} />
        )}
      </div>
      {read.cut && (
        <p className="border-t border-[color:var(--border-hairline)] px-4 py-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.cut}
        </p>
      )}
    </div>
  );
}

const cell =
  "border-r border-b border-[color:var(--border-hairline)] px-2 py-1 text-left whitespace-nowrap";
// The soft band over the card: opaque, as it stays on top of the cells it
// scrolls over (--surface-soft is translucent in the dark theme).
const band =
  "bg-card bg-[linear-gradient(var(--surface-soft),var(--surface-soft))] font-medium text-[color:var(--text-secondary)]";
const head = cn(band, "sticky top-0");

/** The rows as a spreadsheet: A, B, C… on top, 1, 2, 3… on the left. */
function Sheet({ rows }: { rows: string[][] }) {
  const width = Math.min(
    PREVIEW_MAX_COLUMNS,
    Math.max(...rows.map((row) => row.length)),
  );
  const columns = Array.from({ length: width }, (_, i) => i);
  return (
    <table className="min-w-full border-separate border-spacing-0 bg-card text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] tabular-nums">
      <thead>
        <tr>
          <th aria-hidden className={cn(cell, head, "left-0 z-20 w-10")} />
          {columns.map((column) => (
            <th key={column} scope="col" className={cn(cell, head, "z-10")}>
              {columnLetter(column)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <th
              scope="row"
              className={cn(cell, band, "sticky left-0 text-right")}
            >
              {index + 1}
            </th>
            {columns.map((column) => (
              <td key={column} className={cn(cell, "max-w-80 truncate")}>
                {row[column] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
