"use server";

import { loadRowHistory } from "@/lib/finance/history";
import type { HistoryEntry } from "@/lib/finance/history";

/** The history of one Finance record, read when its side sheet opens. */
export async function readRowHistory(rowId: string): Promise<HistoryEntry[]> {
  if (!/^[0-9a-f-]{36}$/i.test(rowId)) return [];
  return loadRowHistory(rowId);
}
