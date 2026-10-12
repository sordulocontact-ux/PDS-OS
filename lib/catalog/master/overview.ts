import "server-only";

import { routes } from "@/lib/auth/redirects";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import {
  DECLARATION_STATUSES,
  ORGANISMS,
  declarationsSummary,
  oneOf,
  splitTotal,
  type DeclarationStatus,
  type MasterRights,
  type Organism,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Figures and checklist of the title overview ("master" in the code). Counts and states are
// computed here, never by the model.

export type MasterCounts = {
  sessions: number;
  contributors: number;
  // Each declaration noted, for the applicability summary (retour 14).
  declarations: Array<{ organism: Organism; status: DeclarationStatus }>;
  // Audio versions of the title, and those at "Master final".
  audioFiles: number;
  finalMasterFiles: number;
};

export async function countMasterItems(
  masterId: string,
): Promise<MasterCounts> {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;
  const [sessions, contributors, declarations, audio, final] =
    await Promise.all([
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
        .select("organism, status")
        .eq("master_id", masterId),
      supabase
        .from("master_files")
        .select("id", count)
        .eq("master_id", masterId)
        .eq("category", "audio"),
      supabase
        .from("master_files")
        .select("id", count)
        .eq("master_id", masterId)
        .eq("category", "audio")
        .eq("audio_state", "final_master"),
    ]);
  for (const result of [sessions, contributors, declarations, audio, final]) {
    if (result.error) console.error("countMasterItems:", result.error.message);
  }
  return {
    sessions: sessions.count ?? 0,
    contributors: contributors.count ?? 0,
    declarations: (declarations.data ?? []).map((d) => ({
      organism: oneOf(ORGANISMS, d.organism, "sacem"),
      status: oneOf(DECLARATION_STATUSES, d.status, "to_verify"),
    })),
    audioFiles: audio.count ?? 0,
    finalMasterFiles: final.count ?? 0,
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
    (() => {
      // Only the applicable declarations count (retour 14).
      const d = declarationsSummary(counts.declarations);
      return {
        key: "declarations",
        label: t.declarations(d.done, d.applicable, d.toQualify),
        done: d.toQualify === 0 && d.done === d.applicable,
        href: routes.masterRights(masterId),
      };
    })(),
    {
      key: "masterFile",
      label: t.masterFile,
      done: counts.finalMasterFiles > 0,
      href: routes.masterAudio(masterId),
    },
  );
  return items;
}
