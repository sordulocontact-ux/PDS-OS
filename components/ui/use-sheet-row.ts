"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * The row of a list open in its side sheet (Finance, lot 3), opened at once
 * when the address names it (`?ouvrir=<id>`, from the ⌘K search, lot 5),
 * also when it changes while the list is shown. The sheet follows its row
 * by id, not by place: a row that moves in the list once saved (a note
 * written in its sheet goes first) stays the one open; a row gone closes it.
 */
export function useSheetRow(ids: string[]) {
  const wanted = useSearchParams().get("ouvrir");
  const known = (id: string | null) => (id && ids.includes(id) ? id : null);
  const [openId, setOpenId] = useState<string | null>(() => known(wanted));
  const [seen, setSeen] = useState(wanted);
  if (wanted !== seen) {
    setSeen(wanted);
    setOpenId(known(wanted));
  }
  const index = openId === null ? -1 : ids.indexOf(openId);
  const setSheet = (to: number | null) =>
    setOpenId(to === null ? null : (ids[to] ?? null));
  return [index >= 0 ? index : null, setSheet] as const;
}
