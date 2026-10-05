// Facts of a specialised workflow's first step (Juridique's État des lieux,
// Master's État du master): what a project already knows, each fact
// classified by code and displayed as is. Client-safe.

import type { Hue } from "@/lib/ui/category-hues";
import { titleHue } from "@/lib/ui/category-hues";

// The Cadrage's three levels, so every workflow speaks alike:
// known = settled by a source; to_confirm = present but not settled;
// missing = nothing yet.
export const FACT_STATUSES = ["known", "to_confirm", "missing"] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

/** The title a fact belongs to, shown as a tag in its own column. */
export type FactGroup = {
  key: string;
  title: string;
  artists: string;
  // The title's category hue (titleHue of its position in the project).
  hue: Hue;
};

export type Fact<Action> = {
  key: string;
  label: string;
  // What it concerns: the role, the file, the parties.
  detail: string | null;
  // Where the fact is read, named for the user ("Crédits du titre").
  source: string;
  status: FactStatus;
  // The precise state ("Dans le Réseau", "Source à confirmer"); the tone
  // comes from `status`, the meaning from this label.
  statusLabel: string;
  // The page where it is completed or checked; null when there is none.
  href: string | null;
  // What can be done right from the row, when the viewer may.
  action?: Action;
  group?: FactGroup;
};

/** A title of the project, as the fact builders need it. */
export type FactTitle = {
  id: string;
  title: string;
  // Credited artists, formatted ("Nova feat. Sable").
  artists: string;
  // Rank in the project (0 first): decides the title's hue.
  position: number;
};

export function groupOf(title: FactTitle): FactGroup {
  return {
    key: title.id,
    title: title.title,
    artists: title.artists,
    hue: titleHue(title.position),
  };
}

export function countFacts(
  sections: Array<{ facts: Array<{ status: FactStatus }> }>,
): Record<FactStatus, number> {
  const counts = { known: 0, to_confirm: 0, missing: 0 };
  for (const section of sections)
    for (const fact of section.facts) counts[fact.status] += 1;
  return counts;
}
