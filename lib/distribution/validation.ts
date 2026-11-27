// The human validation of the dossier (ticket « Distribution » § 6.7, CA06,
// § 11): may it be submitted, what the latest version says, and what changed
// at the sources since the version was submitted (§ 13: « le master, la
// cover, les droits ou la date de sortie changent après validation »). Pure;
// the SQL functions refuse with the same rules (20261011100201).

import { isOpen, type Anomaly } from "@/lib/distribution/anomalies";
import type { RecordedCheck } from "@/lib/distribution/checks";
import type { DossierSection } from "@/lib/distribution/delivery-file";
import { missingParams } from "@/lib/distribution/delivery-file";
import type { DossierParams } from "@/lib/distribution/dossier";
import type { Readiness } from "@/lib/distribution/readiness";
import { distribution } from "@/lib/i18n/fr/distribution";
import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";

const fr = { distribution, participationWaivers };

export type VersionStatus = "pending" | "approved" | "rejected";

// What a refusal names to correct: an owner module, or the dossier's own
// parameters (supabase/migrations/20261026200101, recette DIST-001).
export const REFUSAL_MODULES = [
  "catalog",
  "master",
  "legal",
  "design",
  "project",
  "distribution",
] as const;
export type RefusalModule = (typeof REFUSAL_MODULES)[number];
export const isRefusalModule = (value: string): value is RefusalModule =>
  (REFUSAL_MODULES as readonly string[]).includes(value);

// What a derogation of the direction lets through.
export const DEROGATION_SCOPES = ["checks", "refusal", "anomalies"] as const;
export type DerogationScope = (typeof DEROGATION_SCOPES)[number];
export const isDerogationScope = (value: string): value is DerogationScope =>
  (DEROGATION_SCOPES as readonly string[]).includes(value);

export type Derogation = {
  id: string;
  scope: DerogationScope[];
  risk: string;
  reason: string;
  dueOn: string;
  grantedBy: string | null;
  grantedAt: string;
  // The version that used it, null while it waits for the submission.
  versionNumber: number | null;
};

export type DistributionVersion = {
  id: string;
  number: number;
  status: VersionStatus;
  submittedBy: string | null;
  submittedAt: string;
  validatorPersonId: string;
  validatorName: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  supersededAt: string | null;
  snapshot: DistributionSnapshot | null;
  // A refusal's modules to correct.
  refusalModules: RefusalModule[];
  // The derogation of the direction this version went through with.
  derogation: Derogation | null;
};

// What a version froze: the dossier as shown, the checks, the readiness.
export type DistributionSnapshot = {
  format: 1;
  sections: DossierSection[];
  checks: RecordedCheck[];
  readiness: { ready: number; total: number };
  params: DossierParams;
};

/** Open: pending, or approved and not yet superseded by a new preparation. */
export function openVersion(
  versions: DistributionVersion[],
): DistributionVersion | null {
  const latest = versions[0] ?? null;
  if (!latest) return null;
  if (latest.status === "pending") return latest;
  if (latest.status === "approved" && latest.supersededAt === null)
    return latest;
  return null;
}

export type SubmitGate = {
  allowed: boolean;
  // Why it cannot be submitted, in words: never passed by a derogation.
  reasons: string[];
  // What blocks unless the direction derogates (recette DIST-001): checks
  // not recorded, the refusal's cause unchanged, an anomaly not corrected.
  derogable: Array<{ scope: DerogationScope; text: string }>;
  // The derogation waiting to be used covers them all.
  derogated: boolean;
};

/** A snapshot's fields read from one module, as the SQL function
 * distribution_snapshot_fields compares them (the UPC left out). */
export function moduleFields(
  sections: DossierSection[],
  module: string,
): string {
  return JSON.stringify(
    sections
      .flatMap((section) =>
        section.groups.flatMap((group) =>
          group.fields
            .filter((f) => f.origin === module && f.key !== "upc")
            .map((f) => [group.key, f.key, f.label, f.value ?? null]),
        ),
      )
      .sort((a, b) =>
        `${a[0]}\u0000${a[1]}\u0000${a[2]}`.localeCompare(
          `${b[0]}\u0000${b[1]}\u0000${b[2]}`,
        ),
      ),
  );
}

export function submitGate(input: {
  readiness: Readiness;
  params: DossierParams;
  validator: { personId: string; name: string } | null;
  checks: RecordedCheck[];
  versions: DistributionVersion[];
  paramsConfirmed: boolean;
  // The sections the next version would freeze.
  sections: DossierSection[];
  anomalies: Anomaly[];
  derogation: Derogation | null;
  // A collective (lot 12): the participations whose contract is not signed,
  // without an open waiver of the release, named; null: none.
  contractGaps?: string | null;
  // A collective's release (lot 15): its provisional titles, named; read
  // only once archived or its title abandoned.
  provisional?: string | null;
  readOnly?: "archived" | "abandoned" | null;
}): SubmitGate {
  const t = fr.distribution.validation.gate;
  const reasons: string[] = [];
  if (input.readOnly) reasons.push(t.readOnly[input.readOnly]);
  if (input.provisional) reasons.push(t.provisional(input.provisional));
  if (input.contractGaps)
    reasons.push(fr.participationWaivers.refused.release(input.contractGaps));
  const open = openVersion(input.versions);
  if (open)
    reasons.push(
      open.status === "pending"
        ? t.pending(open.number)
        : t.approved(open.number),
    );
  if (input.readiness.blockers.length) reasons.push(t.blockers());
  if (!input.paramsConfirmed) reasons.push(t.notConfirmed);
  const missing = missingParams(input.params);
  if (missing.length) reasons.push(t.params(missing.join(", ")));
  if (!input.validator) reasons.push(t.noValidator);
  const nonCompliant = input.checks.filter((c) => c.result === "non_compliant");
  if (nonCompliant.length) reasons.push(t.nonCompliant(nonCompliant.length));

  const derogable: SubmitGate["derogable"] = [];
  const unchecked = input.checks.filter((c) => c.result === "unchecked");
  if (unchecked.length)
    derogable.push({ scope: "checks", text: t.unrecorded(unchecked.length) });
  const last = input.versions[0];
  if (!open && last?.status === "rejected" && last.snapshot) {
    const frozen = last.snapshot.sections;
    const same = last.refusalModules.filter(
      (m) => moduleFields(frozen, m) === moduleFields(input.sections, m),
    );
    if (same.length)
      derogable.push({
        scope: "refusal",
        text: t.refusalUnresolved(
          last.number,
          same.map((m) => fr.distribution.anomalies.modules[m]).join(", "),
        ),
      });
  }
  const unresolved = input.anomalies.filter((a) => {
    if (!isOpen(a) || a.module === "distributor" || a.version === null)
      return false;
    const found = input.versions.find((v) => v.number === a.version);
    return (
      found?.snapshot != null &&
      moduleFields(found.snapshot.sections, a.module) ===
        moduleFields(input.sections, a.module)
    );
  });
  if (!open && unresolved.length)
    derogable.push({
      scope: "anomalies",
      text: t.anomaliesUnresolved(
        unresolved
          .map((a) => fr.distribution.anomalies.modules[a.module])
          .join(", "),
      ),
    });
  const usable =
    input.derogation && input.derogation.versionNumber === null
      ? input.derogation
      : null;
  const derogated =
    derogable.length > 0 &&
    usable !== null &&
    derogable.every((d) => usable.scope.includes(d.scope));
  return {
    allowed: reasons.length === 0 && (derogable.length === 0 || derogated),
    reasons,
    derogable,
    derogated,
  };
}

export type DriftLine = {
  section: string;
  // The module the value comes from (a parameter: « distribution »).
  origin: string;
  label: string;
  before: string | null;
  now: string | null;
};

/** Every field whose value differs between a version and the sources now
 * (a UPC that arrives after the version, once given, is not one). */
export function snapshotDrift(
  frozen: DossierSection[],
  current: DossierSection[],
): DriftLine[] {
  const flat = (sections: DossierSection[]) =>
    new Map(
      sections.flatMap((section) =>
        section.groups.flatMap((group) =>
          group.fields.map((field) => [
            `${section.key}/${group.key}/${field.key}/${field.label}`,
            {
              key: field.key,
              origin: field.origin,
              section: group.title ?? section.title,
              label: field.label,
              value: field.value,
            },
          ]),
        ),
      ),
    );
  const before = flat(frozen);
  const now = flat(current);
  const keys = new Set([...before.keys(), ...now.keys()]);
  return [...keys].flatMap((key) => {
    const a = before.get(key);
    const b = now.get(key);
    if ((a?.value ?? null) === (b?.value ?? null)) return [];
    // The UPC given by The Orchard at the deposit, after the version was
    // validated « Attribué au dépôt »: what was expected, not a change.
    if (b?.key === "upc" && !a?.value) return [];
    const ref = b ?? a;
    if (!ref) return [];
    return [
      {
        section: ref.section,
        origin: ref.origin,
        label: ref.label,
        before: a?.value ?? null,
        now: b?.value ?? null,
      },
    ];
  });
}

/** The modules a correction touched, from what changed (the checks of
 * those modules only are to redo). */
export const driftModules = (drift: DriftLine[]): string[] => [
  ...new Set(drift.map((line) => line.origin)),
];

/** Whether a version froze its title's cover from the Catalogue (the cover
 * field read from the Catalogue module, not from the Production). */
export function frozeCatalogCover(
  snapshot: DistributionSnapshot | null,
): boolean {
  return (snapshot?.sections ?? []).some((section) =>
    section.groups.some((group) =>
      group.fields.some(
        (field) => field.key === "cover" && field.origin === "catalog",
      ),
    ),
  );
}

/** A stored snapshot, read back defensively. */
export function asSnapshot(value: unknown): DistributionSnapshot | null {
  if (
    value &&
    typeof value === "object" &&
    (value as { format?: unknown }).format === 1 &&
    Array.isArray((value as { sections?: unknown }).sections)
  )
    return value as DistributionSnapshot;
  return null;
}
