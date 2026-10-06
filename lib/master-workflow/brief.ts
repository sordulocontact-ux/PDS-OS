import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { isBudgetStatus } from "@/lib/budget/types";
import { asCallStatus } from "@/lib/calls/constants";
import {
  BRIEF_COLUMNS,
  briefFromRow,
  emptyBrief,
} from "@/lib/master-workflow/brief-row";
import type {
  BriefPerson,
  BriefView,
  MasterBrief,
} from "@/lib/master-workflow/brief-types";
import type { FlowCredit } from "@/lib/master-workflow/engineer-facts";
import { masterExchangeAgenda } from "@/lib/master-workflow/exchange-agenda";
import { loadFramingDefaults } from "@/lib/master-workflow/framing-defaults";
import { readMasterRows } from "@/lib/master-workflow/inventory-rows";
import { networkEngineers } from "@/lib/master-workflow/network-engineers";
import { materialFacts, sourceFacts } from "@/lib/master-workflow/source-facts";
import type { EngineerRole } from "@/lib/master-workflow/types";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// From these states on, the call has a transcript to propose from.
const TRANSCRIBED = ["transcribed", "extracting", "ready"];

const BRIEF_SELECT = `${BRIEF_COLUMNS}, updated_at, updater:people!master_briefs_updated_by_fkey(first_name, last_name)`;

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
  const [rows, saved, creatives, exchanges, budget, framing] =
    await Promise.all([
      readMasterRows(project.id, project.masters),
      supabase
        .from("master_briefs")
        .select(BRIEF_SELECT)
        .eq("project_id", project.id)
        .maybeSingle(),
      listProjectCreatives(project.id),
      supabase
        .from("master_brief_calls")
        .select(
          "call:calls!master_brief_calls_call_same_org(id, title, occurred_at, status)",
        )
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("budget_lines")
        .select("master_role, amount_cents, status")
        .eq("project_id", project.id)
        .not("master_role", "is", null),
      loadFramingDefaults(project.id),
    ]);
  if (exchanges.error)
    console.error("loadMasterBrief exchanges:", exchanges.error.message);
  if (saved.error) console.error("loadMasterBrief:", saved.error.message);
  const canEdit = canEditProject(access, project);
  const canEditCatalog = can(access, "manage_catalog");

  const row = saved.data;
  // Credits on the titles first, then what the Cadrage confirmed.
  const mixCredited =
    creditedContact(rows.creditsOf, "mix_engineer") ?? framing.mixContactId;
  const masteringCredited =
    creditedContact(rows.creditsOf, "mastering_engineer") ??
    framing.masteringContactId;
  const sameCredited =
    mixCredited !== null && mixCredited === masteringCredited;
  const brief: MasterBrief = row
    ? briefFromRow(row)
    : {
        ...emptyBrief(project.ownerPersonId),
        mixContactId: mixCredited,
        masteringSameEngineer: sameCredited,
        masteringContactId: sameCredited ? null : masteringCredited,
        dates: {
          ...emptyBrief(project.ownerPersonId).dates,
          masterFinalDue: framing.masterFinalDue,
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

  const sources = rows.titles.flatMap((title) => [
    ...sourceFacts(
      title,
      rows.audioOf.get(title.id) ?? [],
      rows.sourceOf.get(title.id) ?? null,
      rows.sessionsOf.get(title.id) ?? [],
      { projectId: project.id, addAudio: canEditCatalog, confirm: canEdit },
    ),
    ...materialFacts(title, rows.stemsOf.get(title.id) ?? 0, canEditCatalog),
  ]);
  // A source still to confirm, or no audio at all: a point of the agenda.
  const sourcesOpen = sources.some(
    (fact) => fact.key.startsWith("source-") && fact.status !== "known",
  );

  return {
    projectId: project.id,
    brief,
    savedAt: row?.updated_at ?? null,
    savedBy: row?.updater
      ? personName(row.updater.first_name, row.updater.last_name)
      : null,
    sources,
    sourcesFailed: Boolean(rows.failed.sources || rows.failed.materials),
    engineers: rows.failed.network
      ? []
      : networkEngineers(rows.contacts, rows.linkedCredits),
    validators,
    exchanges: (exchanges.data ?? []).flatMap((row) =>
      row.call
        ? [
            {
              callId: row.call.id,
              title: row.call.title,
              occurredAt: row.call.occurred_at,
              status: asCallStatus(row.call.status),
              href: routes.projectCall(project.id, row.call.id),
              canPropose: TRANSCRIBED.includes(row.call.status),
            },
          ]
        : [],
    ),
    nextAgenda: masterExchangeAgenda(brief, sourcesOpen),
    budget: (budget.data ?? []).flatMap((row) =>
      (row.master_role === "mix" || row.master_role === "mastering") &&
      isBudgetStatus(row.status)
        ? [
            {
              role: row.master_role,
              amountCents: row.amount_cents,
              status: row.status,
            },
          ]
        : [],
    ),
    canEdit,
    canAddContact: can(access, "manage_network"),
    organizationId: canEditCatalog ? access.organizationId : null,
  };
}
