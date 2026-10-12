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
import {
  distributionStateOf,
  type DistributionState,
} from "@/lib/catalog/master/title-status";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Checklist and distribution state of the title overview ("master" in the
// code). Counts and states are computed here, never by the model.

export type MasterCounts = {
  contributors: number;
  // Each declaration noted, for the applicability summary (retour 14).
  declarations: Array<{ organism: Organism; status: DeclarationStatus }>;
};

export async function countMasterItems(
  masterId: string,
): Promise<MasterCounts> {
  const supabase = await createClient();
  const [contributors, declarations] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("id", { count: "exact", head: true })
      .eq("master_id", masterId),
    supabase
      .from("master_declarations")
      .select("organism, status")
      .eq("master_id", masterId),
  ]);
  for (const result of [contributors, declarations]) {
    if (result.error) console.error("countMasterItems:", result.error.message);
  }
  return {
    contributors: contributors.count ?? 0,
    declarations: (declarations.data ?? []).map((d) => ({
      organism: oneOf(ORGANISMS, d.organism, "sacem"),
      status: oneOf(DECLARATION_STATUSES, d.status, "to_verify"),
    })),
  };
}

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  // Needed to release the title (retour Catalogue 12), or useful only.
  priority: "high" | "normal";
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
  // An approved Master final (retour 13: deposited is not validated).
  finalValidated: boolean;
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
      priority: "high",
      href: null,
    },
    {
      key: "iswc",
      label: t.iswc,
      done: rights.iswc !== null,
      priority: "normal",
      href: routes.masterRights(masterId),
    },
    {
      key: "rightsHolder",
      label: t.rightsHolder,
      done: rights.rightsHolder !== null,
      priority: "high",
      href: routes.masterRights(masterId),
    },
    {
      key: "contributors",
      label: t.contributors,
      done: counts.contributors > 0,
      priority: "normal",
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
        priority: "high",
        href: routes.masterSplits(masterId),
      },
      {
        key: "publishingSplits",
        label: t.publishingSplits,
        done: splitTotal(splits, "publishing").status === "complete",
        priority: "high",
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
        priority: "normal" as const,
        href: routes.masterRights(masterId),
      };
    })(),
    {
      key: "masterFile",
      label: t.masterFile,
      done: input.finalValidated,
      priority: "high",
      href: routes.masterAudio(masterId),
    },
  );
  // What is missing first, the most important first; then what is done.
  const order = (item: ChecklistItem) =>
    (item.done ? 2 : 0) + (item.priority === "high" ? 0 : 1);
  return items.toSorted((a, b) => order(a) - order(b));
}

/**
 * The distribution state of a title across its live projects (retour
 * Catalogue 01), read with the viewer's session: what RLS hides does not
 * count.
 */
export async function loadDistributionState(
  projectIds: string[],
): Promise<DistributionState> {
  if (projectIds.length === 0) return "not_prepared";
  const supabase = await createClient();
  const [releases, deposits, dossiers] = await Promise.all([
    supabase
      .from("releases")
      .select("online_detected_at, planned_release_date")
      .in("project_id", projectIds),
    supabase
      .from("distribution_declarations")
      .select("id")
      .in("project_id", projectIds)
      .eq("kind", "deposit")
      .is("withdrawn_at", null)
      .limit(1),
    supabase
      .from("distribution_dossiers")
      .select("id")
      .in("project_id", projectIds)
      .limit(1),
  ]);
  for (const result of [releases, deposits, dossiers])
    if (result.error)
      console.error("loadDistributionState:", result.error.message);
  const rows = releases.data ?? [];
  return distributionStateOf({
    online: rows.some((r) => r.online_detected_at !== null),
    delivered: (deposits.data ?? []).length > 0,
    preparing:
      (dossiers.data ?? []).length > 0 ||
      rows.some((r) => r.planned_release_date !== null),
  });
}
