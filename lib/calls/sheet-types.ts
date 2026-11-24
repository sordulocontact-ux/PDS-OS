// What the side sheet of a call shows beyond its row (the Réseau's model,
// docs/STYLE-FINANCE-PARTOUT.md § 6.7 bis, Sacha 24/11/2026), read when it
// opens (loadCallSheet). Client-safe.

import type { SheetPerson } from "@/lib/ui/record-sheet";

export type CallSheetData = {
  // Folded under their counts in the summary card.
  team: SheetPerson[];
  guests: SheetPerson[];
  // Its latest report's summary.
  summary: string | null;
};
