import "server-only";

import { isDivergent } from "@/lib/activations/agency/divergence";
import {
  loadModuleFacts,
  type ModuleFacts,
} from "@/lib/activations/module-facts";
import type { ActivationRecord } from "@/lib/activations/types";
import type { Alert, RuleStep } from "@/lib/activations/states";
import { fr } from "@/lib/i18n/fr";

const t = fr.activations.module;

export { loadModuleFacts, type ModuleFacts };

/** Rows whose agency status is ahead of, or contradicts, the PDS decision. */
export function divergentRows(rows: ModuleFacts["rows"]) {
  return rows.filter(isDivergent);
}

const step = (key: string, label: string, reason: string): RuleStep => ({
  key: `m_${key}`,
  label,
  reason,
});

/**
 * The module's own next steps and alerts for one activation, in the order of
 * its path: framing, then the in-house work (targets, concepts, messages,
 * contents, opportunities) or the agency's (source, decisions, recap,
 * report).
 */
export function moduleSignals(
  a: ActivationRecord,
  m: ModuleFacts,
  today: string,
): { steps: RuleStep[]; alerts: Alert[] } {
  const steps: RuleStep[] = [];
  const alerts: Alert[] = [];
  if (a.kind !== "influence" && a.kind !== "press") return { steps, alerts };
  const mine = <T extends { activation_id: string }>(list: T[]) =>
    list.filter((x) => x.activation_id === a.id);

  const framing = mine(m.sheets).find((s) => s.kind === "framing");
  if (
    !framing ||
    framing.status === "draft" ||
    framing.status === "changes_requested"
  )
    steps.push(step("framing", t.framing.label, t.framing.reason));
  else if (framing.status === "to_validate")
    steps.push(
      step(
        "framing_decision",
        t.framingDecision.label,
        t.framingDecision.reason,
      ),
    );

  const messages = mine(m.messages);
  const toValidate = messages.filter((x) => x.status === "to_validate").length;
  const toSend = messages.filter((x) => x.status === "validated").length;

  if (a.mode === "agency") {
    const rows = mine(m.rows);
    if (mine(m.sources).length === 0)
      steps.push(
        step("agency_source", t.agencySource.label, t.agencySource.reason),
      );
    const pending = rows.filter(
      (r) => !r.absent_since && r.pds_decision === "to_review",
    );
    if (pending.length > 0)
      steps.push(
        step(
          "agency_review",
          t.agencyReview.label(pending.length),
          t.agencyReview.reason,
        ),
      );
    const lastRecap = messages
      .filter((x) => x.kind === "agency_recap" && x.sent_declared_at)
      .map((x) => x.sent_declared_at as string)
      .sort()
      .at(-1);
    const unsent = rows.filter(
      (r) =>
        r.decided_at &&
        r.pds_decision !== "to_review" &&
        (!lastRecap || r.decided_at > lastRecap),
    );
    if (unsent.length > 0)
      steps.push(
        step(
          "agency_recap",
          t.agencyRecap.label(unsent.length),
          t.agencyRecap.reason,
        ),
      );
    const reports = mine(m.reports);
    if (reports.some((r) => r.status === "received"))
      steps.push(
        step("agency_report", t.agencyReport.label, t.agencyReport.reason),
      );
    else if (reports.length === 0 && a.status === "done_declared")
      steps.push(
        step(
          "agency_report_missing",
          t.agencyReportMissing.label,
          t.agencyReportMissing.reason,
        ),
      );
    const divergent = divergentRows(rows).length;
    if (divergent > 0)
      alerts.push({
        key: "module:agency_divergence",
        category: "validation",
        severity: "medium",
        text: t.divergence(divergent),
      });
  } else if (a.kind === "influence") {
    const concepts = mine(m.sheets).filter((s) => s.kind === "concept");
    const latest = new Map<string, string>();
    for (const c of concepts) {
      const key = c.target_id ?? "generic";
      if (!latest.has(key)) latest.set(key, c.status);
    }
    const conceptsWaiting = [...latest.values()].filter(
      (s) => s === "to_validate",
    ).length;
    if (conceptsWaiting > 0)
      steps.push(
        step("concepts", t.concepts.label(conceptsWaiting), t.concepts.reason),
      );
    const undecided = mine(m.contents).filter((c) => !c.decision).length;
    if (undecided > 0)
      steps.push(
        step("contents", t.contents.label(undecided), t.contents.reason),
      );
    const expired = mine(m.rights).filter(
      (r) =>
        r.kind === "ads" &&
        r.status === "accepted" &&
        r.ends_on &&
        r.ends_on < today,
    ).length;
    if (expired > 0)
      alerts.push({
        key: "module:ads_rights_expired",
        category: "legal",
        severity: "high",
        text: t.adsExpired(expired),
      });
  } else {
    const done = mine(m.opportunities).filter(
      (o) =>
        o.status === "confirmed" &&
        o.scheduled_at &&
        o.scheduled_at.slice(0, 10) < today,
    ).length;
    if (done > 0)
      steps.push(
        step("interviews", t.interviews.label(done), t.interviews.reason),
      );
  }
  if (toValidate > 0)
    steps.push(
      step(
        "messages_validate",
        t.messagesValidate.label(toValidate),
        t.messagesValidate.reason,
      ),
    );
  if (toSend > 0)
    steps.push(
      step(
        "messages_send",
        t.messagesSend.label(toSend),
        t.messagesSend.reason,
      ),
    );
  return { steps, alerts };
}
