"use client";

import { useState } from "react";

import type { SplitRow } from "@/components/legal/splits/split-editor-row";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { listSplitPeople } from "@/lib/legal/splits/party-actions";
import type { SplitLine } from "@/lib/legal/splits/queries";
import {
  FULL,
  equalUnits,
  exactShare,
  type SplitRole,
} from "@/lib/legal/splits/shares";

const EMPTY_LINE = {
  name: "",
  role: "composer" as SplitRole,
  units: FULL,
  contactId: null,
  creditId: null,
};

/** The lines of the split editor, and the people each line may name (read
 * once for every line, again after a contact is added to the Réseau). */
export function useSplitRows(masterId: string, initial: SplitLine[]) {
  const [rows, setRows] = useState<SplitRow[]>(() =>
    (initial.length > 0 ? initial : [EMPTY_LINE]).map((line, i) => ({
      key: i,
      name: line.name,
      role: line.role,
      share: exactShare(line.units),
      contactId: line.contactId,
      creditId: line.creditId,
    })),
  );
  const loadPeople = usePickerLoad(() => listSplitPeople(masterId));

  const set = (key: number, change: Partial<SplitRow>) =>
    setRows((all) =>
      all.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );

  return {
    rows,
    set,
    // A line with a name only stays unlinked: never linked by its name.
    load: loadPeople,
    add: () =>
      setRows((all) => [
        ...all,
        {
          key: Math.max(...all.map((r) => r.key)) + 1,
          name: "",
          role: "composer",
          share: "",
          contactId: null,
          creditId: null,
        },
      ]),
    remove: (key: number) => setRows((all) => all.filter((r) => r.key !== key)),
    equal: () => {
      const parts = equalUnits(rows.length);
      setRows((all) =>
        all.map((row, i) => ({ ...row, share: exactShare(parts[i]) })),
      );
    },
  };
}
