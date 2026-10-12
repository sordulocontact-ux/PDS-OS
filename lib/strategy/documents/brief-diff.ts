// What changed between two versions of the Brief de sortie (MKT-S1-16,
// docs/ARCHITECTURE.md § 6 bis, « Révisions »): read in the two frozen
// snapshots, item by item in each dimension, never rewritten. Pure,
// client-safe.

import type {
  BriefSnapshot,
  SnapshotItem,
} from "@/lib/strategy/documents/brief-snapshot";
import type { StrategyDimension } from "@/lib/strategy/dimensions";

export type BriefChange = {
  dimension: StrategyDimension;
  // The item's label (null: the dimension's main text).
  label: string | null;
  kind: "added" | "removed" | "changed";
  before: string | null;
  after: string | null;
};

/** An item in words: its value, then its lines (« head — rest »). */
export function itemText(item: SnapshotItem): string | null {
  const lines = item.lines.map((l) =>
    [l.head, l.rest].filter(Boolean).join(" — "),
  );
  const text = [item.value, ...lines].filter(Boolean).join("\n").trim();
  return text === "" ? null : text;
}

// Items are matched by label; unlabelled ones by their rank among those.
function keyed(items: SnapshotItem[]): Map<string, SnapshotItem> {
  const map = new Map<string, SnapshotItem>();
  let unlabelled = 0;
  for (const item of items) map.set(item.label ?? `#${unlabelled++}`, item);
  return map;
}

/**
 * Every item added, removed or changed, dimension by dimension in the
 * order of the newer version; the date the snapshot was taken is not a
 * change.
 */
export function briefChanges(
  before: BriefSnapshot,
  after: BriefSnapshot,
): BriefChange[] {
  const changes: BriefChange[] = [];
  for (const section of after.sections) {
    const old = before.sections.find((s) => s.dimension === section.dimension);
    const was = keyed(old?.items ?? []);
    const now = keyed(section.items);
    for (const [key, item] of now) {
      const label = item.label;
      const next = itemText(item);
      const prev = was.has(key) ? itemText(was.get(key)!) : null;
      if (prev === next) continue;
      changes.push({
        dimension: section.dimension,
        label,
        kind: prev === null ? "added" : next === null ? "removed" : "changed",
        before: prev,
        after: next,
      });
    }
    for (const [key, item] of was) {
      if (now.has(key)) continue;
      const prev = itemText(item);
      if (prev === null) continue;
      changes.push({
        dimension: section.dimension,
        label: item.label,
        kind: "removed",
        before: prev,
        after: null,
      });
    }
  }
  return changes;
}
