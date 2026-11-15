import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { loadAnomalies } from "@/lib/distribution/anomalies-queries";
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
  isDerogationScope,
  isRefusalModule,
  openVersion,
  snapshotDrift,
  submitGate,
  type Derogation,
  type DistributionSnapshot,
  type DistributionVersion,
  type DriftLine,
  type SubmitGate,
} from "@/lib/distribution/validation";
import { loadMembers, loadValidators } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import type { ProjectDetail } from "@/lib/projects/types";
import {
  inScope,
  releaseIdOf,
  type ScopedProject,
} from "@/lib/distribution/scope";
import type { DistributionProject } from "@/lib/distribution/release-scope";
import { formatDay as formatDate } from "@/lib/utils/day";
import { gapNames, loadContractGaps } from "@/lib/legal/contract-gaps";
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
  // The derogation of the direction waiting for the next submission.
  derogation: Derogation | null;
  gate: SubmitGate;
  // What changed at the sources since the open version was submitted.
  drift: DriftLine[];
  canEdit: boolean;
  // The owner or the designated validator records the checks.
  canCheck: boolean;
  // The viewer is the validator the open version waits for.
  canDecide: boolean;
  // The direction (`administer`) grants a derogation.
  canDerogate: boolean;
};

/**
 * Everything the Dossier step shows, read with the viewer's session. The
 * submission action calls it too, so the server checks with the same rule
 * as the screen.
 */
export async function loadDistributionView(
  project: ProjectDetail & ScopedProject,
  access: Access,
): Promise<DistributionView> {
  const supabase = await createClient();
  // A collective's release (lot 15): its deposit alone.
  const releaseId = releaseIdOf(project);
  const release = project.distributionRelease ?? null;
  const releaseTitles = new Set(
    ((project as Partial<DistributionProject>).distributionTitles ?? []).map(
      (t) => t.id,
    ),
  );
  const [
    sources,
    members,
    validators,
    checkRows,
    versionRows,
    dossier,
    derogationRows,
    anomalies,
    contractGaps,
  ] = await Promise.all([
    loadDistributionSources(project, access),
    loadMembers(access),
    access.organizationId
      ? loadValidators(access.organizationId)
      : Promise.resolve([]),
    inScope(
      supabase
        .from("distribution_checks")
        .select(
          "check_key, result, note, checked_by, checked_at, version_number",
        )
        .eq("project_id", project.id),
      releaseId,
    ),
    inScope(
      supabase
        .from("distribution_versions")
        .select(
          "id, number, status, submitted_by, submitted_at, validator_person_id, decided_by, decided_at, decision_note, superseded_at, snapshot, refusal_modules, derogation_id",
        )
        .eq("project_id", project.id),
      releaseId,
    ).order("number", { ascending: false }),
    inScope(
      supabase
        .from("distribution_dossiers")
        .select("validator_person_id")
        .eq("project_id", project.id),
      releaseId,
    ).maybeSingle(),
    inScope(
      supabase
        .from("distribution_derogations")
        .select(
          "id, scope, risk, reason, due_on, granted_by, granted_at, version_number, revoked_at",
        )
        .eq("project_id", project.id),
      releaseId,
    ).is("revoked_at", null),
    loadAnomalies(project.id, access, releaseId),
    // A collective (lot 12): the release waits for every contract signed or
    // waived; the same rule as the database's.
    project.collective
      ? loadContractGaps(project.id, "release").then((gaps) =>
          // A release's contracts (lot 15): its title's, or every title of
          // the compilation.
          releaseId ? gaps.filter((g) => releaseTitles.has(g.titleId)) : gaps,
        )
      : Promise.resolve([]),
  ]);
  const provisional = release
    ? ((project as Partial<DistributionProject>).distributionTitles ?? [])
        .filter((t) => t.master?.provisional)
        .map((t) => fr.projectTitles.unnamed(t.position))
    : [];
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
    // A collective's release (lot 15): a single, or the compilation.
    format: release
      ? fr.shell.musicFormats[
          release.kind === "title" ? "single" : "compilation"
        ]
      : project.musicFormat
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
            version: row.version_number,
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

  const derogations: Derogation[] = (derogationRows.data ?? []).map((row) => ({
    id: row.id,
    scope: row.scope.filter(isDerogationScope),
    risk: row.risk,
    reason: row.reason,
    dueOn: row.due_on,
    grantedBy: nameOf(row.granted_by),
    grantedAt: row.granted_at,
    versionNumber: row.version_number,
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
      refusalModules: (row.refusal_modules ?? []).filter(isRefusalModule),
      derogation: derogations.find((d) => d.id === row.derogation_id) ?? null,
    }),
  );
  const open = openVersion(versions);
  const derogation = derogations.find((d) => d.versionNumber === null) ?? null;

  const validatorId = dossier.data?.validator_person_id ?? null;
  const validatorOptions = validators.filter(
    (person) => person.personId !== project.ownerPersonId,
  );
  // Designated but no longer holding `validate`: not a validator any more.
  const validator =
    validatorId && validators.some((v) => v.personId === validatorId)
      ? { personId: validatorId, name: nameOf(validatorId) ?? "—" }
      : null;

  // A release archived or its title abandoned is read only (lot 15).
  const canEdit =
    canEditProject(access, project) && !project.distributionRelease?.readOnly;
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
    derogation,
    gate: submitGate({
      readiness,
      params: sources.params,
      validator,
      checks,
      versions,
      paramsConfirmed: sources.paramsConfirmed !== null,
      sections,
      anomalies,
      derogation,
      contractGaps: contractGaps.length ? gapNames(contractGaps) : null,
      provisional: provisional.length ? provisional.join(", ") : null,
      readOnly: release?.readOnly ?? null,
    }),
    drift: open?.snapshot
      ? snapshotDrift(open.snapshot.sections, sections)
      : [],
    canEdit,
    canCheck: canEdit || isValidator,
    canDecide:
      open?.status === "pending" && open.validatorPersonId === access.personId,
    canDerogate: can(access, "administer"),
  };
}

/** What a submitted version freezes (§ 5: the audit snapshot). */
export function snapshotOf(view: DistributionView): DistributionSnapshot {
  return {
    format: 1,
    sections: view.sections,
    checks: view.checks.map(
      ({ key, result, note, checkedBy, checkedAt, version }) => ({
        key,
        result,
        note,
        checkedBy,
        checkedAt,
        version,
      }),
    ),
    readiness: { ready: view.readiness.ready, total: view.readiness.total },
    params: view.sources.params,
  };
}
