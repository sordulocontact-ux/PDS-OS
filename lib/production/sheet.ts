import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import type { Access } from "@/lib/auth/access";
import {
  budgetTotals,
  isBudgetStatus,
  type BudgetTotals,
} from "@/lib/budget/types";
import {
  DESIGN_TOPICS,
  isDesignTopic,
  type DesignTopic,
} from "@/lib/design/intentions";
import { projectDesignVersions } from "@/lib/design/versions";
import {
  handedFicheOf,
  readHandoffs,
  type HandedFiche,
} from "@/lib/production/fiche";
import { loadMembers, type Member } from "@/lib/framing/related";
import {
  cameraSetupOf,
  coverageOf,
  soundCaptureOf,
  type ProductionBrief,
} from "@/lib/production/brief";
import {
  organizationOf,
  type SheetOrganization,
} from "@/lib/production/organization";
import { isNeedFamily, type NeedFamily } from "@/lib/production/roles";
import {
  readyChangesOf,
  readyPlanOf,
  readyRowsOf,
  type ReadyChange,
  type ReadyPlanLine,
  type ReadyRow,
} from "@/lib/production/ready-rows";
import { createClient } from "@/lib/supabase/server";

export type ProductionMode = "direct" | "call" | "import";
export type Availability = "to_confirm" | "available" | "unavailable";

/** A member of PDS or a contact of the Réseau. */
export type Holder = { kind: "person" | "contact"; id: string; name: string };

export type NetworkOption = { id: string; name: string; roles: string[] };

export type ProductionAssignment = {
  id: string;
  holder: Holder;
  availability: Availability;
  availabilitySetBy: string | null;
  availabilitySetAt: string | null;
  note: string | null;
};

export type ProductionNeed = {
  id: string;
  family: NeedFamily;
  roleKey: string;
  label: string | null;
  speciality: string | null;
  headcount: number;
  note: string | null;
  assignments: ProductionAssignment[];
};

/** What Conception already decided: shown, never asked again (ticket § 1). */
export type ProductionHeritage = {
  // The Fiche Livrable handed over by the Conception (the source of truth
  // when there is one), and the version of a later hand-off.
  fiche: HandedFiche | null;
  newerFiche: number | null;
  // The approved version the sheet was opened from (or would be): the
  // source when no Fiche was handed over.
  source: {
    versionId: string;
    number: number;
    href: string | null;
    note: string | null;
    reviewerName: string;
    reviewedAt: string | null;
  } | null;
  // A newer version was approved in Conception after the sheet was opened.
  newerApproved: number | null;
  // Confirmed intentions, the deliverable's own first, then the direction's.
  intentions: {
    topic: DesignTopic;
    value: string;
    scope: "deliverable" | "direction";
  }[];
  references: { url: string; note: string | null }[];
  // Points still open in Conception: topics with no confirmed answer, and
  // proposals nobody has confirmed yet.
  missingTopics: DesignTopic[];
  pendingProposals: number;
  // Dated milestones of the calendar attached to this deliverable.
  milestones: { title: string; occursOn: string }[];
  // The budget lines of the deliverable's lever, totalled by code.
  budget: BudgetTotals | null;
};

export type ProductionSheetData = {
  deliverable: {
    id: string;
    title: string;
    leverLabel: string | null;
    quantity: number | null;
    dueDate: string | null;
    assigneeName: string | null;
  };
  heritage: ProductionHeritage;
  // The project's owner (the chef de projet who prepares).
  ownerName: string | null;
  ownerPersonId: string | null;
  stageState: string;
  sheet: {
    id: string;
    mode: ProductionMode;
    openedAt: string;
    director: Holder | null;
    brief: ProductionBrief;
    briefUpdatedAt: string | null;
    briefUpdatedBy: string | null;
    // Production's own schedule, envelope and location (null = not set:
    // the Fiche's value applies, lib/production/logistics.ts).
    logistics: SheetLogistics;
    readyAt: string | null;
    readyBy: string | null;
    // Who produces and who holds each role (lib/production/organization.ts).
    organization: SheetOrganization;
    // Closed by its owner once transmitted (PROD-040).
    closedAt: string | null;
    closedBy: string | null;
    // « Demander une révision du devis » after a validation (proto).
    quoteRevision: { reason: string; by: string | null; at: string } | null;
    // A new version of the director's proposal asked (a place replaced).
    directionRevision: { reason: string; by: string | null; at: string } | null;
    // « Validation créative externe » (PR-11): a Réseau contact, or none.
    creativeExt: Holder | null;
    // Teasers « Décliné du Clip officiel » (PR-13): the clip's sheet.
    derivedFromSheetId: string | null;
    // The shoot's date changed after a first decision (« À revoir »).
    scheduleChangedAt: string | null;
    // The synthesis confirmed before the shoot, as it was (external).
    readySnapshot: ReadyRow[] | null;
    readyForcedReason: string | null;
    // Who approved a derogation before the shoot (MKT-PROD-002).
    readyApprovedBy: string | null;
    // Reopened by a change after the confirmation (MKT-PROD-001).
    readyReopened: { at: string; because: ReadyChange[] } | null;
    // A derogation asked to the direction, waiting (MKT-PROD-002).
    readyRequest: {
      at: string;
      byId: string | null;
      by: string | null;
      rows: ReadyRow[];
      reason: string;
      plan: (ReadyPlanLine & { person: string | null })[];
    } | null;
    // Who decides a derogation: the quote validator (else the direction).
    quoteValidatorId: string | null;
  } | null;
  needs: ProductionNeed[];
  // The owner, while Production may start or runs, on a validated sheet.
  canOpen: boolean;
  // The owner, while Production runs: needs, assignments, director, calls.
  canOrganize: boolean;
  // The owner or the designated director (a member), while Production runs.
  canWriteBrief: boolean;
  members: Member[];
  contacts: NetworkOption[];
};

export type SheetLogistics = {
  shootDate: string | null;
  postStart: string | null;
  postEnd: string | null;
  deliveryDate: string | null;
  budgetEnvelopeCents: number | null;
  locationStatus: "to_find" | "to_verify" | "confirmed";
  locationName: string | null;
  locationAddress: string | null;
  locationAccess: string | null;
  locationNotes: string | null;
};

const locationStatusOf = (value: string): SheetLogistics["locationStatus"] =>
  value === "to_verify" || value === "confirmed" ? value : "to_find";

const modeOf = (value: string): ProductionMode =>
  value === "call" || value === "import" ? value : "direct";
const availabilityOf = (value: string): Availability =>
  value === "available" || value === "unavailable" ? value : "to_confirm";

/**
 * What every deliverable's sheet reads of its project, once per request:
 * the project's journeys read the sheet of each deliverable in one render,
 * and each repeated these reads (page loads audit, docs/ARCHITECTURE.md
 * § 3 bis). Same queries, under RLS; shared, never changed by a caller.
 */
const sheetProjectRows = trackedCache(async (projectId: string) => {
  const supabase = await createClient();
  return Promise.all([
    supabase
      .from("projects")
      .select("id, owner_person_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_stages")
      .select("state, stage_definitions!inner(key)")
      .eq("project_id", projectId)
      .eq("stage_definitions.key", "production")
      .maybeSingle(),
    projectDesignVersions(projectId),
    supabase
      .from("design_intentions")
      .select("topic, value, status, target, design_deliverable_id, updated_at")
      .eq("project_id", projectId)
      .in("status", ["confirmed", "proposed"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("design_references")
      .select("url, note, design_reference_links(design_deliverable_id)")
      .eq("project_id", projectId)
      .order("created_at"),
  ]);
});

/** The Réseau's active contacts (the organization's, under RLS), once per
 * request for every sheet. */
const activeNetworkContacts = trackedCache(async () => {
  const supabase = await createClient();
  return supabase
    .from("network_contacts")
    .select("id, name, roles")
    .is("archived_at", null)
    .order("name")
    .limit(1000);
});

/**
 * One deliverable's production sheet and everything it inherits from
 * Conception, read with the user's session. Null when the deliverable is not
 * in this project (or not visible).
 */
async function loadSheet(
  projectId: string,
  deliverableId: string,
  access: Access,
): Promise<ProductionSheetData | null> {
  const supabase = await createClient();
  // Two rounds, not four (recette 19/10: the Production's first opening
  // took seconds): everything keyed by the project or the deliverable at
  // once, then what needs the deliverable's lever or the sheet. RLS applies
  // to every read: starting them before the existence check reveals nothing.
  const [
    [projectRes, stageRes, versions, intentionsRes, referencesRes],
    deliverableRes,
    sheetRes,
    designDeliverableRes,
    milestonesRes,
    contactsRes,
    members,
    handoffs,
  ] = await Promise.all([
    sheetProjectRows(projectId),
    supabase
      .from("strategy_deliverables")
      .select(
        "id, title, lever_id, quantity, due_date, assignee_person_id, levers(label)",
      )
      .eq("id", deliverableId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("production_sheets")
      .select("*")
      .eq("deliverable_id", deliverableId)
      .maybeSingle(),
    supabase
      .from("design_deliverables")
      .select("id")
      .eq("strategy_deliverable_id", deliverableId)
      .maybeSingle(),
    supabase
      .from("milestones")
      .select("title, occurs_on")
      .eq("deliverable_id", deliverableId)
      .order("occurs_on"),
    activeNetworkContacts(),
    loadMembers(access),
    readHandoffs(supabase, deliverableId),
  ]);
  const project = projectRes.data;
  const d = deliverableRes.data;
  if (!project || !d) return null;

  const designDeliverableId = designDeliverableRes.data?.id ?? null;
  const sheetRow = sheetRes.data;
  const handed = handedFicheOf(handoffs, sheetRow?.handoff_id ?? null);
  const [budgetRes, needsRes, assignmentsRes] = await Promise.all([
    d.lever_id
      ? supabase
          .from("budget_lines")
          .select("amount_cents, status")
          .eq("project_id", projectId)
          .eq("lever_id", d.lever_id)
      : Promise.resolve({
          data: [] as { amount_cents: number; status: string }[],
        }),
    sheetRow
      ? supabase
          .from("production_needs")
          .select("id, family, role_key, label, speciality, headcount, note")
          .eq("sheet_id", sheetRow.id)
          .order("position")
          .order("created_at")
      : Promise.resolve({ data: [] }),
    sheetRow
      ? supabase
          .from("production_assignments")
          .select(
            "id, need_id, person_id, contact_id, availability, availability_set_by, availability_set_at, note, created_at",
          )
          .eq("project_id", projectId)
          .order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;
  const contacts: NetworkOption[] = (contactsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    roles: c.roles,
  }));
  const contactName = (id: string) =>
    contacts.find((c) => c.id === id)?.name ?? "—";
  const holderOf = (
    personId: string | null,
    contactId: string | null,
  ): Holder | null =>
    personId
      ? { kind: "person", id: personId, name: nameOf(personId) ?? "—" }
      : contactId
        ? { kind: "contact", id: contactId, name: contactName(contactId) }
        : null;

  // The source: the version the sheet was opened from, else the latest
  // approved one (what opening would take).
  const approved = versions.filter(
    (v) => v.deliverableId === deliverableId && v.status === "approved",
  );
  const sourceVersion =
    (sheetRow?.source_version_id
      ? approved.find((v) => v.id === sheetRow.source_version_id)
      : null) ??
    approved[0] ??
    null;
  const newest = approved[0] ?? null;

  const intentionRows = (intentionsRes.data ?? []).filter((i) =>
    isDesignTopic(i.topic),
  );
  const ownRows = intentionRows.filter(
    (i) =>
      i.target === "deliverable" &&
      designDeliverableId !== null &&
      i.design_deliverable_id === designDeliverableId,
  );
  const directionRows = intentionRows.filter((i) => i.target === "direction");
  const confirmedOwn = ownRows.filter((i) => i.status === "confirmed");
  const confirmedDirection = directionRows.filter(
    (i) => i.status === "confirmed",
  );
  const answered = new Set(confirmedOwn.map((i) => i.topic));

  const budgetLines = (budgetRes.data ?? []).flatMap((l) =>
    isBudgetStatus(l.status)
      ? [{ amountCents: l.amount_cents, status: l.status }]
      : [],
  );

  const assignments = assignmentsRes.data ?? [];
  const needs: ProductionNeed[] = (needsRes.data ?? []).flatMap((n) =>
    isNeedFamily(n.family)
      ? [
          {
            id: n.id,
            family: n.family,
            roleKey: n.role_key,
            label: n.label,
            speciality: n.speciality,
            headcount: n.headcount,
            note: n.note,
            assignments: assignments
              .filter((a) => a.need_id === n.id)
              .flatMap((a) => {
                const holder = holderOf(a.person_id, a.contact_id);
                return holder
                  ? [
                      {
                        id: a.id,
                        holder,
                        availability: availabilityOf(a.availability),
                        availabilitySetBy: nameOf(a.availability_set_by),
                        availabilitySetAt: a.availability_set_at,
                        note: a.note,
                      },
                    ]
                  : [];
              }),
          },
        ]
      : [],
  );

  const stageState = stageRes.data?.state ?? "not_started";
  const isOwner =
    access.personId !== null && project.owner_person_id === access.personId;
  const running = stageState === "in_progress";
  const sheet = sheetRow
    ? {
        id: sheetRow.id,
        mode: modeOf(sheetRow.mode),
        openedAt: sheetRow.opened_at,
        director: holderOf(
          sheetRow.director_person_id,
          sheetRow.director_contact_id,
        ),
        brief: {
          coverage: coverageOf(sheetRow.coverage),
          cameraSetup: cameraSetupOf(sheetRow.camera_setup),
          soundCapture: soundCaptureOf(sheetRow.sound_capture),
          stagingIntent: sheetRow.staging_intent,
          coverageNote: sheetRow.coverage_note,
          cameraNote: sheetRow.camera_note,
          soundNote: sheetRow.sound_note,
          runOfShow: sheetRow.run_of_show,
          constraintsNote: sheetRow.constraints_note,
          referencesNote: sheetRow.references_note,
          openNeeds: sheetRow.open_needs,
        },
        briefUpdatedAt: sheetRow.brief_updated_at,
        briefUpdatedBy: nameOf(sheetRow.brief_updated_by),
        logistics: {
          shootDate: sheetRow.shoot_date,
          postStart: sheetRow.post_start,
          postEnd: sheetRow.post_end,
          deliveryDate: sheetRow.delivery_date,
          budgetEnvelopeCents: sheetRow.budget_envelope_cents,
          locationStatus: locationStatusOf(sheetRow.location_status),
          locationName: sheetRow.location_name,
          locationAddress: sheetRow.location_address,
          locationAccess: sheetRow.location_access,
          locationNotes: sheetRow.location_notes,
        },
        readyAt: sheetRow.ready_at,
        readyBy: nameOf(sheetRow.ready_by),
        organization: organizationOf(sheetRow, holderOf, nameOf),
        closedAt: sheetRow.closed_at,
        closedBy: nameOf(sheetRow.closed_by),
        quoteRevision:
          sheetRow.quote_revision_at && sheetRow.quote_revision_reason
            ? {
                reason: sheetRow.quote_revision_reason,
                by: nameOf(sheetRow.quote_revision_by),
                at: sheetRow.quote_revision_at,
              }
            : null,
        readySnapshot: readyRowsOf(sheetRow.ready_snapshot),
        readyForcedReason: sheetRow.ready_forced_reason,
        readyApprovedBy: nameOf(sheetRow.ready_approved_by),
        readyReopened: sheetRow.ready_reopened_at
          ? {
              at: sheetRow.ready_reopened_at,
              because: readyChangesOf(sheetRow.ready_reopened_because),
            }
          : null,
        readyRequest: sheetRow.ready_request_at
          ? {
              at: sheetRow.ready_request_at,
              byId: sheetRow.ready_request_by,
              by: nameOf(sheetRow.ready_request_by),
              rows: readyRowsOf(sheetRow.ready_request_snapshot) ?? [],
              reason: sheetRow.ready_request_reason ?? "",
              plan: readyPlanOf(sheetRow.ready_request_plan).map((l) => ({
                ...l,
                person: nameOf(l.personId),
              })),
            }
          : null,
        quoteValidatorId: sheetRow.quote_validator_person_id,
        directionRevision:
          sheetRow.direction_revision_at && sheetRow.direction_revision_reason
            ? {
                reason: sheetRow.direction_revision_reason,
                by: nameOf(sheetRow.direction_revision_by),
                at: sheetRow.direction_revision_at,
              }
            : null,
        creativeExt: holderOf(null, sheetRow.creative_ext_contact_id),
        derivedFromSheetId: sheetRow.derived_from_sheet_id,
        scheduleChangedAt: sheetRow.schedule_changed_at,
      }
    : null;

  return {
    deliverable: {
      id: d.id,
      title: d.title,
      leverLabel: d.levers?.label ?? null,
      quantity: d.quantity,
      dueDate: d.due_date,
      assigneeName: nameOf(d.assignee_person_id),
    },
    ownerName: nameOf(project.owner_person_id),
    ownerPersonId: project.owner_person_id,
    heritage: {
      fiche: handed.fiche,
      newerFiche: handed.newerVersion,
      source: sourceVersion
        ? {
            versionId: sourceVersion.id,
            number: sourceVersion.number,
            href: sourceVersion.href,
            note: sourceVersion.note,
            reviewerName: sourceVersion.reviewerName,
            reviewedAt: sourceVersion.reviewedAt,
          }
        : null,
      newerApproved:
        sheetRow &&
        newest &&
        sourceVersion &&
        newest.number > sourceVersion.number
          ? newest.number
          : null,
      intentions: [
        ...confirmedOwn.map((i) => ({
          topic: i.topic as DesignTopic,
          value: i.value,
          scope: "deliverable" as const,
        })),
        ...confirmedDirection.map((i) => ({
          topic: i.topic as DesignTopic,
          value: i.value,
          scope: "direction" as const,
        })),
      ],
      references: (referencesRes.data ?? [])
        .filter((r) =>
          r.design_reference_links.some(
            (l) =>
              l.design_deliverable_id === null ||
              l.design_deliverable_id === designDeliverableId,
          ),
        )
        // Links here; files reach Production with the handed-over Fiche.
        .flatMap((r) => (r.url ? [{ url: r.url, note: r.note }] : [])),
      missingTopics: DESIGN_TOPICS.filter((topic) => !answered.has(topic)),
      pendingProposals: ownRows.filter((i) => i.status === "proposed").length,
      milestones: (milestonesRes.data ?? []).map((m) => ({
        title: m.title,
        occursOn: m.occurs_on,
      })),
      budget: budgetLines.length > 0 ? budgetTotals(budgetLines, null) : null,
    },
    stageState,
    sheet,
    needs,
    canOpen:
      isOwner &&
      (handed.fiche !== null || sourceVersion !== null) &&
      (stageState === "not_started" || running),
    // The owner or the designated line producer; a closed production stays
    // readable only (PROD-040).
    canOrganize:
      (isOwner ||
        (access.personId !== null &&
          sheet?.organization.lineProducer?.personId === access.personId)) &&
      running &&
      sheet !== null &&
      !sheet.closedAt,
    canWriteBrief:
      running &&
      sheet !== null &&
      !sheet.closedAt &&
      (isOwner ||
        (sheet.director?.kind === "person" &&
          sheet.director.id === access.personId)),
    members,
    contacts,
  };
}

/** Cached per request: the layout and the tab read it once. */
export const loadProductionSheet = trackedCache(loadSheet);
