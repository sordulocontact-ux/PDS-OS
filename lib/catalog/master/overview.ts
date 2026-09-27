import "server-only";

import { routes } from "@/lib/auth/redirects";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import {
  ORGANISMS,
  splitTotal,
  type MasterRights,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Figures and checklist of the master overview. Counts and states are
// computed here, never by the model.

export type MasterCounts = {
  sessions: number;
  contributors: number;
  declarationsFiled: number;
  masterFiles: number;
};

export async function countMasterItems(
  masterId: string,
): Promise<MasterCounts> {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;
  const [sessions, contributors, declarations, files] = await Promise.all([
    supabase
      .from("master_sessions")
      .select("id", count)
      .eq("master_id", masterId),
    supabase
      .from("master_contributors")
      .select("id", count)
      .eq("master_id", masterId),
    supabase
      .from("master_declarations")
      .select("id", count)
      .eq("master_id", masterId)
      .neq("status", "rejected"),
    supabase
      .from("master_files")
      .select("id", count)
      .eq("master_id", masterId)
      .eq("category", "master"),
  ]);
  for (const result of [sessions, contributors, declarations, files]) {
    if (result.error) console.error("countMasterItems:", result.error.message);
  }
  return {
    sessions: sessions.count ?? 0,
    contributors: contributors.count ?? 0,
    declarationsFiled: declarations.count ?? 0,
    masterFiles: files.count ?? 0,
  };
}

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  // The tab where it is completed; null when it is the header's "Modifier".
  href: string | null;
};

/**
 * What the master's file still needs. Splits appear only for a viewer who
 * may read them (manage_catalog); a refused declaration does not count.
 */
export async function masterChecklist(input: {
  masterId: string;
  isrc: string | null;
  rights: MasterRights;
  counts: MasterCounts;
  withSplits: boolean;
}): Promise<ChecklistItem[]> {
  const { masterId, rights, counts } = input;
  const t = fr.masterPage.overview.checklist;
  const items: ChecklistItem[] = [
    {
      key: "isrc",
      label: t.isrc,
      done: input.isrc !== null,
      href: null,
    },
    {
      key: "iswc",
      label: t.iswc,
      done: rights.iswc !== null,
      href: routes.masterRights(masterId),
    },
    {
      key: "rightsHolder",
      label: t.rightsHolder,
      done: rights.rightsHolder !== null,
      href: routes.masterRights(masterId),
    },
    {
      key: "contributors",
      label: t.contributors,
      done: counts.contributors > 0,
      href: routes.masterCredits(masterId),
    },
  ];
  if (input.withSplits) {
    const { splits } = await listMasterSplits(masterId);
    items.push(
      {
        key: "masterSplits",
        label: t.masterSplits,
        done: splitTotal(splits, "master").status === "complete",
        href: routes.masterSplits(masterId),
      },
      {
        key: "publishingSplits",
        label: t.publishingSplits,
        done: splitTotal(splits, "publishing").status === "complete",
        href: routes.masterSplits(masterId),
      },
    );
  }
  items.push(
    {
      key: "declarations",
      label: t.declarations(counts.declarationsFiled, ORGANISMS.length),
      done: counts.declarationsFiled === ORGANISMS.length,
      href: routes.masterRights(masterId),
    },
    {
      key: "masterFile",
      label: t.masterFile,
      done: counts.masterFiles > 0,
      href: routes.masterFiles(masterId),
    },
  );
  return items;
}
