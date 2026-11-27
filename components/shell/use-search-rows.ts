"use client";

import { useMemo } from "react";

import { useQuickCreate } from "@/components/shell/quick-create/quick-create-provider";
import { shell } from "@/lib/i18n/fr/shell";
import type { ActionRow, SearchHit, SearchRow } from "@/lib/search/types";

const fr = { shell };

// Case and accents do not count: « dep » finds « Ajouter une dépense ».
function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * The rows of the ⌘K: the reader's « Créer » actions first (all of them
 * while nothing is typed, else those whose label holds the text), then the
 * server hits. The actions come from the shell's provider, not the server.
 */
export function useSearchRows(typed: string, hits: SearchHit[]): SearchRow[] {
  const { actions } = useQuickCreate();
  return useMemo(() => {
    const labels = fr.shell.quickCreate.actions;
    const needle = fold(typed);
    const rows: ActionRow[] = actions
      .map((action) => ({
        id: `action-${action}`,
        group: "action" as const,
        action,
        label: labels[action],
      }))
      .filter((row) => fold(row.label).includes(needle));
    return [...rows, ...hits];
  }, [actions, typed, hits]);
}
