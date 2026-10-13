// What changed between two versions of a title's split (JUR-29, the
// version comparator): who was added or removed, whose role or share
// moved. A person is the same across versions by their contact, else by
// their name. Pure, client-safe.

import { fr } from "@/lib/i18n/fr";
import type { SplitLine } from "@/lib/legal/splits/queries";
import { formatShare } from "@/lib/legal/splits/shares";

const keyOf = (l: Pick<SplitLine, "contactId" | "name">) =>
  l.contactId ?? `name:${l.name.trim().toLowerCase()}`;

export function splitChanges(
  before: SplitLine[],
  after: SplitLine[],
): string[] {
  const t = fr.legalSplits.changes;
  const role = (r: SplitLine["role"]) => fr.legalSplits.roles[r];
  const old = new Map(before.map((l) => [keyOf(l), l]));
  const changes: string[] = [];
  for (const l of after) {
    const was = old.get(keyOf(l));
    old.delete(keyOf(l));
    if (!was) {
      changes.push(t.added(l.name, role(l.role), formatShare(l.units)));
      continue;
    }
    if (was.role !== l.role)
      changes.push(t.role(l.name, role(was.role), role(l.role)));
    if (was.units !== l.units)
      changes.push(
        t.share(l.name, formatShare(was.units), formatShare(l.units)),
      );
  }
  for (const l of old.values())
    changes.push(t.removed(l.name, formatShare(l.units)));
  return changes;
}
