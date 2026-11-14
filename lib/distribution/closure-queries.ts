import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { loadAnomalies } from "@/lib/distribution/anomalies-queries";
import {
  checksOf,
  isCheckKey,
  isCheckResult,
  type RecordedCheck,
} from "@/lib/distribution/checks";
import {
  CRITICALITIES,
  closureReadiness,
  isClosureKind,
  isReasonKind,
  type ClosureKind,
  type ClosureReadiness,
  type Criticality,
  type ReasonKind,
  type Reserve,
  type ReserveCause,
} from "@/lib/distribution/closure";
import type { PlatformView } from "@/lib/distribution/platforms";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { loadMembers, loadValidators } from "@/lib/framing/related";
import type { ProjectDetail } from "@/lib/projects/types";
import { todayInParis } from "@/lib/insights/dates";
import {
  inScope,
  releaseIdOf,
  type ScopedProject,
} from "@/lib/distribution/scope";
import { createClient } from "@/lib/supabase/server";

export type Closure = {
  id: string;
  version: number | null;
  kind: ClosureKind;
  // Why the direction closed ahead of time (cancelled, abandoned, early).
  reasonKind: ReasonKind | null;
  // With reserves before The Orchard accepted: the direction's call.
  early: boolean;
  reserves: Reserve[];
  arbitration: string | null;
  status: "pending" | "closed" | "rejected";
  proposedBy: string | null;
  proposedAt: string;
  validatorName: string | null;
  validatorPersonId: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  reopened: { at: string; by: string | null; note: string | null } | null;
};

// A reserve of a decided closure, followed until lifted (DIST-007).
export type ReserveRow = {
  id: string;
  category: ReserveCause;
  label: string;
  details: string[];
  criticality: Criticality;
  ownerPersonId: string;
  ownerName: string | null;
  dueOn: string;
  expectedProof: string;
  status: "open" | "lift_requested" | "lifted";
  overdue: boolean;
  liftNote: string | null;
  liftProof: { path: string; name: string } | null;
  liftProofUrl: string | null;
  liftRequestedById: string | null;
  liftRequestedBy: string | null;
  liftRequestedAt: string | null;
  liftedBy: string | null;
  liftedAt: string | null;
  liftRefusalNote: string | null;
  // The viewer may ask to lift it (its owner, or the project's owner)…
  canRequest: boolean;
  // …or confirm a lift someone else asked.
  canDecide: boolean;
};

export type HistoryEvent = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  actor: string | null;
  at: string;
};

export type ClosureView = {
  readiness: ClosureReadiness;
  closures: Closure[];
  // Pending, or closed and not reopened.
  current: Closure | null;
  // The reserves of the current closure, once decided.
  reserveRows: ReserveRow[];
  // Members, for the owner of a reserve.
  members: Array<{ personId: string; name: string }>;
  // The direction (`administer`) decides a closure ahead of time.
  canDirect: boolean;
  validator: { personId: string; name: string } | null;
  events: HistoryEvent[];
  platforms: PlatformView[];
  canEdit: boolean;
  canCheck: boolean;
  canDecide: boolean;
};

const asReserves = (value: unknown): Reserve[] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Reserve).label === "string" &&
        Array.isArray((item as Reserve).details)
          ? [
              {
                ...(item as Reserve),
                criticality: (CRITICALITIES as readonly string[]).includes(
                  (item as Reserve).criticality,
                )
                  ? (item as Reserve).criticality
                  : "major",
              },
            ]
          : [],
      )
    : [];

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];

/** The closure step: conditions, reserves, closures and the history. */
export async function loadClosureView(
  project: ProjectDetail & ScopedProject,
  access: Access,
): Promise<ClosureView> {
  const supabase = await createClient();
  const releaseId = releaseIdOf(project);
  const [
    platforms,
    anomalies,
    checkRows,
    closureRows,
    eventRows,
    members,
    validators,
    dossier,
    reserveRows,
  ] = await Promise.all([
    loadPlatformsView(project, access),
    loadAnomalies(project.id, access, releaseId),
    inScope(
      supabase
        .from("distribution_checks")
        .select("check_key, result, note, checked_by, checked_at")
        .eq("project_id", project.id),
      releaseId,
    ),
    inScope(
      supabase
        .from("distribution_closures")
        .select(
          "id, version_number, kind, reason_kind, early, reserves, arbitration, status, proposed_by, proposed_at, validator_person_id, decided_by, decided_at, decision_note, reopened_by, reopened_at, reopen_note",
        )
        .eq("project_id", project.id),
      releaseId,
    ).order("proposed_at", { ascending: false }),
    inScope(
      supabase
        .from("distribution_events")
        .select("id, kind, data, actor, created_at")
        .eq("project_id", project.id),
      releaseId,
    )
      .order("created_at", { ascending: false })
      .limit(300),
    loadMembers(access),
    access.organizationId
      ? loadValidators(access.organizationId)
      : Promise.resolve([]),
    inScope(
      supabase
        .from("distribution_dossiers")
        .select("validator_person_id")
        .eq("project_id", project.id),
      releaseId,
    ).maybeSingle(),
    inScope(
      supabase
        .from("distribution_reserves")
        .select(
          "id, closure_id, position, category, label, details, criticality, owner_person_id, due_on, expected_proof, status, overdue_at, lift_note, lift_proof_path, lift_proof_name, lift_proof_url, lift_requested_by, lift_requested_at, lifted_by, lifted_at, lift_refusal_note",
        )
        .eq("project_id", project.id),
      releaseId,
    ).order("position"),
  ]);
  const nameOf = (personId: string | null) =>
    personId
      ? (members.find((m) => m.personId === personId)?.name ?? null)
      : null;

  const checks: RecordedCheck[] = checksOf(
    (checkRows.data ?? []).flatMap((row) =>
      isCheckKey(row.check_key) && isCheckResult(row.result)
        ? [
            {
              key: row.check_key,
              result: row.result,
              note: row.note,
              checkedBy: row.checked_by,
              checkedAt: row.checked_at,
            },
          ]
        : [],
    ),
  );
  const closures: Closure[] = (closureRows.data ?? []).map((row) => ({
    id: row.id,
    version: row.version_number,
    kind: isClosureKind(row.kind) ? row.kind : "reserves",
    reasonKind:
      row.reason_kind && isReasonKind(row.reason_kind) ? row.reason_kind : null,
    early: row.early,
    reserves: asReserves(row.reserves),
    arbitration: row.arbitration,
    status:
      row.status === "closed" || row.status === "rejected"
        ? row.status
        : "pending",
    proposedBy: nameOf(row.proposed_by),
    proposedAt: row.proposed_at,
    validatorName: nameOf(row.validator_person_id),
    validatorPersonId: row.validator_person_id,
    decidedBy: nameOf(row.decided_by),
    decidedAt: row.decided_at,
    decisionNote: row.decision_note,
    reopened: row.reopened_at
      ? {
          at: row.reopened_at,
          by: nameOf(row.reopened_by),
          note: row.reopen_note,
        }
      : null,
  }));
  const current =
    closures.find(
      (c) => c.status === "pending" || (c.status === "closed" && !c.reopened),
    ) ?? null;
  const validatorId = dossier.data?.validator_person_id ?? null;
  const validator =
    validatorId && validators.some((v) => v.personId === validatorId)
      ? { personId: validatorId, name: nameOf(validatorId) ?? "—" }
      : null;

  const canEdit = platforms.canEdit;
  const canCheck = platforms.canCheck;
  const canDirect = can(access, "administer");
  const today = todayInParis();
  const rows: ReserveRow[] = (reserveRows.data ?? [])
    .filter((row) => current !== null && row.closure_id === current.id)
    .map((row) => {
      const requestedBy = row.lift_requested_by;
      return {
        id: row.id,
        category: row.category as ReserveCause,
        label: row.label,
        details: asStrings(row.details),
        criticality: (CRITICALITIES as readonly string[]).includes(
          row.criticality,
        )
          ? (row.criticality as Criticality)
          : "major",
        ownerPersonId: row.owner_person_id,
        ownerName: nameOf(row.owner_person_id),
        dueOn: row.due_on,
        expectedProof: row.expected_proof,
        status:
          row.status === "lifted" || row.status === "lift_requested"
            ? row.status
            : "open",
        overdue:
          row.status !== "lifted" &&
          (row.overdue_at !== null || row.due_on < today),
        liftNote: row.lift_note,
        liftProof:
          row.lift_proof_path && row.lift_proof_name
            ? { path: row.lift_proof_path, name: row.lift_proof_name }
            : null,
        liftProofUrl: row.lift_proof_url,
        liftRequestedById: requestedBy,
        liftRequestedBy: nameOf(requestedBy),
        liftRequestedAt: row.lift_requested_at,
        liftedBy: nameOf(row.lifted_by),
        liftedAt: row.lifted_at,
        liftRefusalNote: row.lift_refusal_note,
        canRequest:
          row.status === "open" &&
          (row.owner_person_id === access.personId || canEdit),
        canDecide:
          row.status === "lift_requested" &&
          (canCheck || canDirect) &&
          requestedBy !== access.personId,
      };
    });
  const direction =
    current !== null &&
    (current.kind === "cancelled" ||
      current.kind === "abandoned" ||
      current.early);

  return {
    readiness: closureReadiness({
      cycle: platforms.cycle,
      platforms: platforms.platforms,
      checks,
      anomalies,
    }),
    closures,
    current,
    reserveRows: rows,
    members: members.map((m) => ({ personId: m.personId, name: m.name })),
    canDirect,
    validator,
    events: (eventRows.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      data:
        row.data && typeof row.data === "object" && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : {},
      actor: nameOf(row.actor),
      at: row.created_at,
    })),
    platforms: platforms.platforms,
    canEdit,
    canCheck,
    canDecide:
      current?.status === "pending" &&
      (direction
        ? canDirect
        : current.validatorPersonId === access.personId &&
          can(access, "validate")),
  };
}
