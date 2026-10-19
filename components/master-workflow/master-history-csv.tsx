"use client";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { MasterHistoryItem } from "@/lib/master-workflow/history";
import { formatShortInstant } from "@/lib/utils/day";

const t = fr.masterJourney.history;
const cell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;

/**
 * « Exporter en CSV » the history shown (Date ; Qui ; Geste ; Suite à),
 * built in the browser from what is on screen: nothing read again, nothing
 * stored.
 */
export function MasterHistoryCsv({ items }: { items: MasterHistoryItem[] }) {
  const download = () => {
    const rows = [
      [...t.csvHead],
      ...items.map((i) => [
        `${i.at} (${formatShortInstant(i.at)})`,
        i.who,
        i.text,
        i.cause,
      ]),
    ];
    const text = rows.map((r) => r.map(cell).join(";")).join("\n");
    // A BOM so spreadsheet software reads the accents.
    const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t.csvName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={download}>
      <IconDownload aria-hidden data-icon="inline-start" />
      {t.csv}
    </Button>
  );
}
