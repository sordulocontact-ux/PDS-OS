"use client";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { legalHistory } from "@/lib/i18n/fr/legal-history";
import type { LegalEvent } from "@/lib/legal/history/types";
import { formatInstantFull } from "@/lib/utils/instant";

const fr = { legalHistory };

const cell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

/**
 * « Exporter en CSV » the history shown (JUR-29): one line per event, the
 * instant in UTC and in Paris time, the same order and identifiers as the
 * screen. Built in the browser from what is already shown: nothing is read
 * again, nothing is stored.
 */
export function HistoryCsvButton({
  events,
  fileName,
}: {
  events: LegalEvent[];
  fileName: string;
}) {
  const t = fr.legalHistory.csv;
  const download = () => {
    const rows = [
      t.columns,
      ...events.map((e) => [
        e.id,
        e.at,
        formatInstantFull(e.at),
        fr.legalHistory.branches[e.branch],
        e.action,
        e.subject,
        e.by,
        e.note,
        e.manualProof,
        e.causeId ?? null,
        e.consequence ?? null,
      ]),
    ];
    const text = rows.map((r) => r.map(cell).join(";")).join("\n");
    // A BOM so spreadsheet software reads the accents.
    const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={events.length === 0}
      onClick={download}
    >
      <IconDownload aria-hidden data-icon="inline-start" />
      {t.export}
    </Button>
  );
}
