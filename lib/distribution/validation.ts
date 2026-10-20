// The human validation of the dossier (ticket « Distribution » § 6.7, CA06,
// § 11): may it be submitted, what the latest version says, and what changed
// at the sources since the version was submitted (§ 13: « le master, la
// cover, les droits ou la date de sortie changent après validation »). Pure;
// the SQL functions refuse with the same rules (20261011100201).

import type { RecordedCheck } from "@/lib/distribution/checks";
import type { DossierSection } from "@/lib/distribution/delivery-file";
import { missingParams } from "@/lib/distribution/delivery-file";
import type { DossierParams } from "@/lib/distribution/dossier";
import type { Readiness } from "@/lib/distribution/readiness";
import { fr } from "@/lib/i18n/fr";

export type VersionStatus = "pending" | "approved" | "rejected";

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
  // Why it cannot be submitted, in words.
  reasons: string[];
  // Said in the recap, never blocking: checks nobody recorded yet.
  warnings: string[];
};

export function submitGate(input: {
  readiness: Readiness;
  params: DossierParams;
  validator: { personId: string; name: string } | null;
  checks: RecordedCheck[];
  versions: DistributionVersion[];
  paramsConfirmed: boolean;
}): SubmitGate {
  const t = fr.distribution.validation.gate;
  const reasons: string[] = [];
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
  const unchecked = input.checks.filter((c) => c.result === "unchecked");
  return {
    allowed: reasons.length === 0,
    reasons,
    warnings: unchecked.length ? [t.unchecked(unchecked.length)] : [],
  };
}

export type DriftLine = {
  section: string;
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
        label: ref.label,
        before: a?.value ?? null,
        now: b?.value ?? null,
      },
    ];
  });
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
