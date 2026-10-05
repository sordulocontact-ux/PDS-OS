import "server-only";

import { fakeEngineerContact } from "@/lib/assistant/test-data/fake-master";
import {
  fillMaster,
  type MasterSection,
  type Step,
} from "@/lib/assistant/test-data/fill-master";
import { logged, type Supabase } from "@/lib/assistant/test-data/writes";
import { can, type Access } from "@/lib/auth/access";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { ENGINEER_ROLES } from "@/lib/master-workflow/types";
import type { ProjectDetail } from "@/lib/projects/types";
import { normalizeSearch } from "@/lib/utils/search";

/**
 * Fills a project's page (docs/ASSISTANT.md § 3 ter): what its pages show
 * (État du master, Juridique) is read from its titles, so every title is
 * filled like its own page, then the mix and mastering engineers join the
 * Réseau and their credits are linked to them. Nothing is replaced.
 */

export type ProjectSection = MasterSection | "network";

/** One step for all titles: failed if any failed, filled if any filled. */
function merge(
  into: Partial<Record<ProjectSection, Step>>,
  steps: Partial<Record<ProjectSection, Step>>,
) {
  for (const [key, step] of Object.entries(steps) as [ProjectSection, Step][]) {
    const before = into[key];
    into[key] =
      before === false || step === false
        ? false
        : before === true || step === true
          ? true
          : null;
  }
}

/**
 * Links every unlinked mix or mastering credit of the titles to its contact
 * of the Réseau, created when no contact bears its name. Null when every
 * credit was already linked.
 */
async function linkEngineers(
  supabase: Supabase,
  organizationId: string,
  masterIds: string[],
): Promise<Step> {
  const [credits, contacts] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("id, name")
      .in("master_id", masterIds)
      .in("role", [...ENGINEER_ROLES])
      .is("contact_id", null),
    supabase
      .from("network_contacts")
      .select("id, name")
      .is("archived_at", null),
  ]);
  if (credits.error || contacts.error) {
    logged(credits.error ? credits : contacts, "network read");
    return false;
  }
  if (!credits.data.length) return null;

  const byName = new Map(
    contacts.data.map((c) => [normalizeSearch(c.name), c.id]),
  );
  for (const credit of credits.data) {
    const key = normalizeSearch(credit.name);
    let contactId = byName.get(key);
    if (!contactId) {
      const { data, error } = await supabase
        .from("network_contacts")
        .insert({
          ...fakeEngineerContact(credit.name),
          kind: "person",
          roles: ["engineer"],
          notes: fr.assistant.testData.notes,
          organization_id: organizationId,
        })
        .select("id")
        .single();
      if (!data) return logged({ error }, "network contact");
      contactId = data.id;
      byName.set(key, contactId);
    }
    const linked = await supabase
      .from("master_contributors")
      .update({ contact_id: contactId })
      .eq("id", credit.id);
    if (!logged(linked, "network link")) return false;
  }
  return true;
}

export async function fillProject(
  supabase: Supabase,
  access: Access,
  project: ProjectDetail,
): Promise<Partial<Record<ProjectSection, Step>>> {
  const steps: Partial<Record<ProjectSection, Step>> = {};
  // One title after the other: each fill already runs many writes.
  for (const { id } of project.masters) {
    const master = await getMaster(id);
    if (!master) continue;
    merge(steps, await fillMaster(supabase, access, master));
  }
  if (can(access, "manage_network"))
    steps.network = await linkEngineers(
      supabase,
      access.organizationId!,
      project.masters.map((m) => m.id),
    );
  return steps;
}
