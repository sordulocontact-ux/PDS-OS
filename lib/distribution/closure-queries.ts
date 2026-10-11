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
  closureReadiness,
  type ClosureReadiness,
  type Reserve,
} from "@/lib/distribution/closure";
import type { PlatformView } from "@/lib/distribution/platforms";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { loadMembers, loadValidators } from "@/lib/framing/related";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type Closure = {
  id: string;
  version: number;
  kind: "normal" | "reserves";
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
          ? [item as Reserve]
          : [],
      )
    : [];

/** The closure step: conditions, reserves, closures and the history. */
export async function loadClosureView(
  project: ProjectDetail,
  access: Access,
): Promise<ClosureView> {
  const supabase = await createClient();
  const [
    platforms,
    anomalies,
    checkRows,
    closureRows,
    eventRows,
    members,
    validators,
    dossier,
  ] = await Promise.all([
    loadPlatformsView(project, access),
    loadAnomalies(project.id, access),
    supabase
      .from("distribution_checks")
      .select("check_key, result, note, checked_by, checked_at")
      .eq("project_id", project.id),
    supabase
      .from("distribution_closures")
      .select(
        "id, version_number, kind, reserves, arbitration, status, proposed_by, proposed_at, validator_person_id, decided_by, decided_at, decision_note, reopened_by, reopened_at, reopen_note",
      )
      .eq("project_id", project.id)
      .order("proposed_at", { ascending: false }),
    supabase
      .from("distribution_events")
      .select("id, kind, data, actor, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(300),
    loadMembers(access),
    access.organizationId
      ? loadValidators(access.organizationId)
      : Promise.resolve([]),
    supabase
      .from("distribution_dossiers")
      .select("validator_person_id")
      .eq("project_id", project.id)
      .maybeSingle(),
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
    kind: row.kind === "normal" ? "normal" : "reserves",
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

  return {
    readiness: closureReadiness({
      cycle: platforms.cycle,
      platforms: platforms.platforms,
      checks,
      anomalies,
    }),
    closures,
    current,
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
    canEdit: platforms.canEdit,
    canCheck: platforms.canCheck,
    canDecide:
      current?.status === "pending" &&
      current.validatorPersonId === access.personId &&
      can(access, "validate"),
  };
}
