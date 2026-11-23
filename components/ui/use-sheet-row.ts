"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * The row of a Finance list open in its side sheet (lot 3), opened at once
 * when the address names it (`?ouvrir=<id>`, from the ⌘K search, lot 5),
 * also when it changes while the list is shown.
 */
export function useSheetRow(ids: string[]) {
  const wanted = useSearchParams().get("ouvrir");
  const indexOf = (id: string | null) => {
    const index = id ? ids.indexOf(id) : -1;
    return index >= 0 ? index : null;
  };
  const [sheet, setSheet] = useState<number | null>(() => indexOf(wanted));
  const [seen, setSeen] = useState(wanted);
  if (wanted !== seen) {
    setSeen(wanted);
    setSheet(indexOf(wanted));
  }
  return [sheet, setSheet] as const;
}
