"use server";

import {
  loadHistory,
  loadRowHistory,
  type HistoryEntry,
} from "@/lib/finance/history";

/** The history of one Finance record, read when its side sheet opens. */
export async function readRowHistory(rowId: string): Promise<HistoryEntry[]> {
  if (!/^[0-9a-f-]{36}$/i.test(rowId)) return [];
  return loadRowHistory(rowId);
}

/** The next changes of Finance (« Voir plus » of Exports). RLS keeps it to
 * who reads Finance. */
export async function readHistoryPage(offset: number): Promise<HistoryEntry[]> {
  if (!Number.isInteger(offset) || offset < 0) return [];
  return (await loadHistory(offset)).entries;
}
