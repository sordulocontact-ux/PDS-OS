import "server-only";

import { can, type Access } from "@/lib/auth/access";
import {
  DEFAULT_DELIVERABLES,
  briefDeliverablesOf,
  type BriefPerson,
  type BriefView,
  type MasterBrief,
} from "@/lib/master-workflow/brief-types";
import type { FlowCredit } from "@/lib/master-workflow/engineer-facts";
import { readMasterRows } from "@/lib/master-workflow/inventory-rows";
import { networkEngineers } from "@/lib/master-workflow/network-engineers";
import { materialFacts, sourceFacts } from "@/lib/master-workflow/source-facts";
import type { EngineerRole } from "@/lib/master-workflow/types";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const BRIEF_SELECT =
  "mix_contact_id, mastering_same_engineer, mastering_contact_id, mix_rate_cents, mastering_rate_cents, revisions, validator_person_id, references_text, direction, constraints_text, deliverables, mix_v1_due, mix_final_due, mastering_due, master_final_due, updated_at, updater:people!master_briefs_updated_by_fkey(first_name, last_name)";

/**
 * The contact credited for a role on the project's titles, when it is one
 * and the same everywhere: what the brief starts from before its first save
 * (the Réseau is read before asking again, ticket § 4).
 */
function creditedContact(
  creditsOf: Map<string, FlowCredit[]>,
  role: EngineerRole,
): string | null {
  const contacts = new Set(
    [...creditsOf.values()]
      .flat()
      .filter((credit) => credit.role === role && credit.contactId)
      .map((credit) => credit.contactId),
  );
  const [only] = contacts;
  return contacts.size === 1 ? (only ?? null) : null;
}

/**
 * The Brief Mix/Master of a project, ready to display: the saved brief, or
 * a first version from what the project already knows (credited engineers,
 * owner as validator, the two masters as deliverables); the sources of the
 * titles; the engineers of the Réseau; who may validate.
 */
export async function loadMasterBrief(
  project: {
    id: string;
    ownerPersonId: string | null;
    ownerName: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<BriefView> {
  const supabase = await createClient();
  const [rows, saved, creatives] = await Promise.all([
    readMasterRows(project.id, project.masters),
    supabase
      .from("master_briefs")
      .select(BRIEF_SELECT)
      .eq("project_id", project.id)
      .maybeSingle(),
    listProjectCreatives(project.id),
  ]);
  if (saved.error) console.error("loadMasterBrief:", saved.error.message);
  const canEdit = canEditProject(access, project);
  const canEditCatalog = can(access, "manage_catalog");

  const row = saved.data;
  const mixCredited = creditedContact(rows.creditsOf, "mix_engineer");
  const masteringCredited = creditedContact(
    rows.creditsOf,
    "mastering_engineer",
  );
  const sameCredited =
    mixCredited !== null && mixCredited === masteringCredited;
  const brief: MasterBrief = row
    ? {
        mixContactId: row.mix_contact_id,
        masteringSameEngineer: row.mastering_same_engineer,
        masteringContactId: row.mastering_contact_id,
        mixRateCents: row.mix_rate_cents,
        masteringRateCents: row.mastering_rate_cents,
        revisions: row.revisions,
        validatorPersonId: row.validator_person_id,
        references: row.references_text,
        direction: row.direction,
        constraints: row.constraints_text,
        deliverables: briefDeliverablesOf(row.deliverables),
        dates: {
          mixV1Due: row.mix_v1_due,
          mixFinalDue: row.mix_final_due,
          masteringDue: row.mastering_due,
          masterFinalDue: row.master_final_due,
        },
      }
    : {
        mixContactId: mixCredited,
        masteringSameEngineer: sameCredited,
        masteringContactId: sameCredited ? null : masteringCredited,
        mixRateCents: null,
        masteringRateCents: null,
        revisions: null,
        validatorPersonId: project.ownerPersonId,
        references: null,
        direction: null,
        constraints: null,
        deliverables: DEFAULT_DELIVERABLES,
        dates: {
          mixV1Due: null,
          mixFinalDue: null,
          masteringDue: null,
          masterFinalDue: null,
        },
      };

  const validators: BriefPerson[] = [
    ...(project.ownerPersonId
      ? [{ personId: project.ownerPersonId, name: project.ownerName ?? "" }]
      : []),
    ...creatives.filter(
      (creative) => creative.personId !== project.ownerPersonId,
    ),
  ];

  return {
    projectId: project.id,
    brief,
    savedAt: row?.updated_at ?? null,
    savedBy: row?.updater
      ? personName(row.updater.first_name, row.updater.last_name)
      : null,
    sources: rows.titles.flatMap((title) => [
      ...sourceFacts(
        title,
        rows.audioOf.get(title.id) ?? [],
        rows.sourceOf.get(title.id) ?? null,
        rows.sessionsOf.get(title.id) ?? [],
        { projectId: project.id, addAudio: canEditCatalog, confirm: canEdit },
      ),
      ...materialFacts(title, rows.stemsOf.get(title.id) ?? 0, canEditCatalog),
    ]),
    sourcesFailed: Boolean(rows.failed.sources || rows.failed.materials),
    engineers: rows.failed.network
      ? []
      : networkEngineers(rows.contacts, rows.linkedCredits),
    validators,
    canEdit,
    canAddContact: can(access, "manage_network"),
    organizationId: canEditCatalog ? access.organizationId : null,
  };
}
