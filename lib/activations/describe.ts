// Words for what lib/activations/states.ts computes: alerts, rule steps,
// reserves. Client-safe.

import type { LaunchGap } from "@/lib/activations/model";
import type { Alert, Reserve, RuleStep } from "@/lib/activations/states";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDate } from "@/lib/release/format";
import { joinList } from "@/lib/utils/sentences";

const fr = { activations };

const t = fr.activations;

export function alertText(a: Alert): string {
  if (a.text) return a.text;
  switch (a.key) {
    case "owner_missing":
      return t.alerts.owner_missing;
    case "overdue":
      return t.alerts.overdue(formatDate(a.subject ?? ""));
    case "proof_missing":
      return t.alerts.proof_missing;
    case "proof_problem":
      return t.alerts.proof_problem;
    case "metrics_missing":
      return t.alerts.metrics_missing;
    case "dependency_open":
      return t.alerts.dependency_open(a.subject ?? "");
    case "dependency_changed":
      return t.alerts.dependency_changed(a.subject ?? "");
    default:
      return "";
  }
}

export function stepText(s: RuleStep): { label: string; reason: string } {
  if (s.label) return { label: s.label, reason: s.reason ?? "" };
  const r = t.next.rules;
  switch (s.key) {
    case "blocker":
      return {
        label: r.blocker.label(s.subject ?? ""),
        reason: r.blocker.reason,
      };
    case "dependency":
      return {
        label: r.dependency.label(s.subject ?? ""),
        reason: r.dependency.reason,
      };
    case "overdue":
      return {
        label: r.overdue.label,
        reason: r.overdue.reason(formatDate(s.subject ?? "")),
      };
    case "owner_missing":
    case "due_missing":
    case "launch":
    case "evidence_missing":
    case "evidence_unverified":
    case "evidence_problem":
    case "metrics_missing":
    case "close":
      return r[s.key];
    default:
      return { label: s.key, reason: "" };
  }
}

export function reserveText(r: Reserve): string {
  if (r.label) return r.label;
  const l = t.closure.reserveLabels;
  if (r.key === "open_blockers") return l.open_blockers(r.count ?? 0);
  if (r.key === "open_targets") return l.open_targets(r.count ?? 0);
  const label = l[r.key as keyof typeof l];
  return typeof label === "string" ? label : r.key;
}

/** « désigner un responsable et fixer l'échéance ». */
export function launchGapsText(gaps: readonly LaunchGap[]): string {
  return joinList(
    gaps.map((g) => t.status.launch.gaps[g]),
    "et",
  );
}
