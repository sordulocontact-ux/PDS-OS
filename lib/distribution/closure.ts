// The closure of the Distribution follow-up (ticket « Distribution » § 10,
// CA14-CA15): the conditions of a normal closure (the same as the SQL
// function distribution_closure_ready), and otherwise the reserves, grouped
// by cause so five unverified platforms make one reserve, their detail
// kept. A reserve is never turned into a verification. Pure.

import { isOpen, type Anomaly } from "@/lib/distribution/anomalies";
import type { RecordedCheck } from "@/lib/distribution/checks";
import { platformLabel, type PlatformView } from "@/lib/distribution/platforms";
import type { CycleState } from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";

export type ReserveCause =
  "distributor" | "availability" | "compliance" | "checks" | "anomalies";

export type Reserve = { cause: ReserveCause; label: string; details: string[] };

export type ClosureCondition = {
  key: ReserveCause;
  label: string;
  met: boolean;
};

export type ClosureReadiness = {
  // A closure (of either kind) needs a validated version and a deposit.
  canPropose: boolean;
  conditions: ClosureCondition[];
  reserves: Reserve[];
  normalPossible: boolean;
};

export function closureReadiness(input: {
  cycle: CycleState | null;
  platforms: PlatformView[];
  checks: RecordedCheck[];
  anomalies: Anomaly[];
}): ClosureReadiness {
  const t = fr.distribution.closure;
  const p = fr.distribution.platforms;
  const c = fr.distribution.checks;
  const { cycle } = input;

  const distributor = [
    cycle?.received ? null : t.details.received,
    cycle?.outcome?.kind === "accepted"
      ? null
      : cycle?.outcome?.kind === "corrections_requested"
        ? t.details.corrections
        : t.details.accepted,
    cycle?.delivered ? null : t.details.delivered,
  ].filter((value): value is string => value !== null);

  const reference = input.platforms.filter((platform) => platform.reference);
  const unverified = reference
    .filter((platform) => platform.verification !== "verified")
    .map(
      (platform) =>
        `${platformLabel(platform)} : ${p.verifications[platform.verification]}${platform.url ? "" : `, ${p.noLink.toLowerCase()}`}`,
    );
  const notCompliant = reference
    .filter(
      (platform) =>
        platform.verification === "verified" &&
        platform.compliance !== "compliant",
    )
    .map(
      (platform) =>
        `${platformLabel(platform)} : ${p.compliances[platform.compliance]}`,
    );
  const checks = input.checks
    .filter(
      (check) =>
        check.result !== "compliant" && check.result !== "not_applicable",
    )
    .map((check) => `${c.items[check.key].label} : ${c.results[check.result]}`);
  const anomalies = input.anomalies
    .filter(isOpen)
    .map(
      (anomaly) =>
        `${fr.distribution.anomalies.kinds[anomaly.kind]} : ${anomaly.description}`,
    );

  const groups: Array<[ReserveCause, string[]]> = [
    ["distributor", distributor],
    ["availability", unverified],
    ["compliance", notCompliant],
    ["checks", checks],
    ["anomalies", anomalies],
  ];
  const reserves: Reserve[] = groups
    .filter(([, details]) => details.length > 0)
    .map(([cause, details]) => ({
      cause,
      label: t.causes[cause](details.length),
      details,
    }));
  // Compliance is met only once every platform of reference was found
  // compliant: an unverified platform is not « conforme » either (its
  // reserve is the availability one, so it is not listed twice).
  const allCompliant = reference.every(
    (platform) => platform.compliance === "compliant",
  );
  const conditions: ClosureCondition[] = groups.map(([key, details]) => ({
    key,
    label: t.conditions[key],
    met: key === "compliance" ? allCompliant : details.length === 0,
  }));
  const canPropose = cycle?.deposit !== null && cycle !== null;
  return {
    canPropose,
    conditions,
    reserves,
    normalPossible: canPropose && reserves.length === 0 && allCompliant,
  };
}
