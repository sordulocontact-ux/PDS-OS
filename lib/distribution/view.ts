import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  checksOf,
  computedSignal,
  isCheckKey,
  isCheckResult,
  type ComputedSignal,
  type RecordedCheck,
} from "@/lib/distribution/checks";
import {
  deliveryFile,
  type DossierSection,
} from "@/lib/distribution/delivery-file";
import {
  distributionReadiness,
  type Readiness,
} from "@/lib/distribution/readiness";
import {
  loadDistributionSources,
  type DistributionSources,
} from "@/lib/distribution/sources";
import {
  asSnapshot,
  openVersion,
  snapshotDrift,
  submitGate,
  type DistributionSnapshot,
  type DistributionVersion,
  type DriftLine,
  type SubmitGate,
} from "@/lib/distribution/validation";
import { loadMembers, loadValidators } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import type { ProjectDetail } from "@/lib/projects/types";
import { formatDay as formatDate } from "@/lib/utils/day";
import { createClient } from "@/lib/supabase/server";

export type CheckView = RecordedCheck & {
  checkedByName: string | null;
  computed: ComputedSignal;
};

export type DistributionView = {
  sources: DistributionSources;
  readiness: Readiness;
  sections: DossierSection[];
  checks: CheckView[];
  validator: { personId: string; name: string } | null;
  // Who may be designated: holders of `validate`, never the owner.
  validatorOptions: Array<{ personId: string; name: string }>;
  versions: DistributionVersion[];
  open: DistributionVersion | null;
  gate: SubmitGate;
  // What changed at the sources since the open version was submitted.
  drift: DriftLine[];
  canEdit: boolean;
  // The owner or the designated validator records the checks.
  canCheck: boolean;
  // The viewer is the validator the open version waits for.
  canDecide: boolean;
};

/**
 * Everything the Dossier step shows, read with the viewer's session. The
 * submission action calls it too, so the server checks with the same rule
 * as the screen.
 */
export async function loadDistributionView(
  project: ProjectDetail,
  access: Access,
): Promise<DistributionView> {
  const supabase = await createClient();
  const [sources, members, validators, checkRows, versionRows, dossier] =
    await Promise.all([
      loadDistributionSources(project, access),
      loadMembers(access),
      access.organizationId
        ? loadValidators(access.organizationId)
        : Promise.resolve([]),
      supabase
        .from("distribution_checks")
        .select("check_key, result, note, checked_by, checked_at")
        .eq("project_id", project.id),
      supabase
        .from("distribution_versions")
        .select(
          "id, number, status, submitted_by, submitted_at, validator_person_id, decided_by, decided_at, decision_note, superseded_at, snapshot",
        )
        .eq("project_id", project.id)
        .order("number", { ascending: false }),
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

  const readiness = distributionReadiness(sources.input, formatDate);
  const sections = deliveryFile({
    sources: sources.input,
    readiness,
    params: sources.params,
    credits: sources.credits,
    label: sources.label,
    format: project.musicFormat
      ? fr.shell.musicFormats[project.musicFormat]
      : null,
    artist: project.artistName || null,
    formatDate,
  });

  const recorded: RecordedCheck[] = (checkRows.data ?? []).flatMap((row) =>
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
  );
  const checks: CheckView[] = checksOf(recorded).map((check) => ({
    ...check,
    checkedByName: nameOf(check.checkedBy),
    computed: computedSignal(check.key, {
      sources: sources.input,
      readiness,
      params: sources.params,
      formatDate,
    }),
  }));

  const versions: DistributionVersion[] = (versionRows.data ?? []).map(
    (row) => ({
      id: row.id,
      number: row.number,
      status:
        row.status === "approved" || row.status === "rejected"
          ? row.status
          : "pending",
      submittedBy: nameOf(row.submitted_by),
      submittedAt: row.submitted_at,
      validatorPersonId: row.validator_person_id,
      validatorName: nameOf(row.validator_person_id),
      decidedBy: nameOf(row.decided_by),
      decidedAt: row.decided_at,
      note: row.decision_note,
      supersededAt: row.superseded_at,
      snapshot: asSnapshot(row.snapshot),
    }),
  );
  const open = openVersion(versions);

  const validatorId = dossier.data?.validator_person_id ?? null;
  const validatorOptions = validators.filter(
    (person) => person.personId !== project.ownerPersonId,
  );
  // Designated but no longer holding `validate`: not a validator any more.
  const validator =
    validatorId && validators.some((v) => v.personId === validatorId)
      ? { personId: validatorId, name: nameOf(validatorId) ?? "—" }
      : null;

  const canEdit = canEditProject(access, project);
  const isValidator =
    validator !== null && validator.personId === access.personId;
  return {
    sources,
    readiness,
    sections,
    checks,
    validator,
    validatorOptions,
    versions,
    open,
    gate: submitGate({
      readiness,
      params: sources.params,
      validator,
      checks,
      versions,
      paramsConfirmed: sources.paramsConfirmed !== null,
    }),
    drift: open?.snapshot
      ? snapshotDrift(open.snapshot.sections, sections)
      : [],
    canEdit,
    canCheck: canEdit || isValidator,
    canDecide:
      open?.status === "pending" && open.validatorPersonId === access.personId,
  };
}

/** What a submitted version freezes (§ 5: the audit snapshot). */
export function snapshotOf(view: DistributionView): DistributionSnapshot {
  return {
    format: 1,
    sections: view.sections,
    checks: view.checks.map(({ key, result, note, checkedBy, checkedAt }) => ({
      key,
      result,
      note,
      checkedBy,
      checkedAt,
    })),
    readiness: { ready: view.readiness.ready, total: view.readiness.total },
    params: view.sources.params,
  };
}
