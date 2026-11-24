"use client";

import { useEffect, useRef, useState } from "react";

/** A record's sheet data: read, null when gone or out of reach, or failed. */
export type RecordSheetLoaded<T> = T | null | "failed";

/**
 * What a record's side sheet reads when it opens (§ 6.7 bis), once per
 * record and kept while the list is shown: ↑ ↓ back to a record already
 * seen shows it at once. undefined while it loads.
 */
export function useRecordSheetData<T>(
  id: string | null,
  load: (id: string) => Promise<T | null>,
): RecordSheetLoaded<T> | undefined {
  const [cache, setCache] = useState<
    ReadonlyMap<string, RecordSheetLoaded<T>>
  >(() => new Map());
  // Asked once per record, even while its answer is on its way.
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!id || asked.current.has(id)) return;
    asked.current.add(id);
    const keep = (value: RecordSheetLoaded<T>) =>
      setCache((current) => new Map(current).set(id, value));
    load(id).then(keep, () => keep("failed"));
  }, [id, load]);
  return id ? cache.get(id) : undefined;
}
