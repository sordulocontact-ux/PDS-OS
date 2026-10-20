// The Historique du master and each step's « Déjà fait » (proto
// `master-v2.html`, VISION-UX § 4): rebuilt from what the tables recorded —
// sources, Brief, questions, sendings and their link, versions, decisions,
// deliverables — never a separate journal written by hand. Pure.

import { fr } from "@/lib/i18n/fr";
import type { MasterStepKey } from "@/lib/ui/master-steps";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

import { eurosHt } from "./invoice-rules";
import type { MasterJourneyFacts } from "./journey-facts";

const t = fr.masterJourney.history;

export type MasterHistoryItem = {
  key: string;
  step: MasterStepKey;
  text: string;
  // A person, « Karim Haddou (lien privé) », or « PDS OS ».
  who: string | null;
  at: string;
  cause: string | null;
};

export function masterHistory(facts: MasterJourneyFacts): MasterHistoryItem[] {
  const items: MasterHistoryItem[] = [];
  const several = facts.titles.length > 1;
  const titleOf = (id: string) =>
    several ? (facts.titles.find((x) => x.id === id)?.title ?? null) : null;
  const engineerOf = (stage: "mix" | "mastering") =>
    facts.transmissions.find((x) => x.role === stage)?.contactName ?? null;
  const linked = (name: string | null) => (name ? t.viaLink(name) : null);

  for (const title of facts.titles)
    for (const s of title.sources)
      items.push({
        key: `src-${s.fileId}-${s.confirmedAt}`,
        step: "source",
        text: t.sourceConfirmed(s.fileName, titleOf(title.id)),
        who: s.confirmedBy,
        at: s.confirmedAt,
        cause: null,
      });

  if (facts.brief?.recordedAt)
    items.push({
      key: "brief",
      step: "brief",
      text: t.briefSaved,
      who: facts.brief.recordedBy,
      at: facts.brief.recordedAt,
      cause: null,
    });
  facts.questions.forEach((q, i) => {
    items.push({
      key: `q-${i}`,
      step: "brief",
      text: t.questionAsked(q.askedToName ?? "—"),
      who: t.pdsName,
      at: q.createdAt,
      cause: null,
    });
    if (q.answeredAt)
      items.push({
        key: `qa-${i}`,
        step: "brief",
        text: t.questionAnswered,
        who: q.askedToName,
        at: q.answeredAt,
        cause: null,
      });
    if (q.appliedAt)
      items.push({
        key: `qp-${i}`,
        step: "brief",
        text: t.questionApplied,
        who: null,
        at: q.appliedAt,
        cause: null,
      });
  });
  facts.exchanges.forEach((e, i) =>
    items.push({
      key: `x-${i}`,
      step: "brief",
      text: t.exchangeCreated(e.title),
      who: null,
      at: e.occurredAt,
      cause: null,
    }),
  );

  for (const x of facts.transmissions) {
    const step = x.role;
    const engineer = linked(x.contactName);
    const push = (
      suffix: string,
      text: string,
      who: string | null,
      at: string | null,
    ) => {
      if (at)
        items.push({
          key: `${x.id}-${suffix}`,
          step,
          text,
          who,
          at,
          cause: null,
        });
    };
    push("sent", t.sent(x.contactName, x.role), x.sentBy, x.createdAt);
    push("link", t.linkSent, null, x.linkSentAt);
    push("open", t.opened, engineer, x.openedAt);
    push("ack", t.acknowledged, engineer, x.acknowledgedAt);
    if (x.revokeReason)
      push("revoke", t.revoked(x.revokeReason), null, x.revokedAt);
  }

  for (const v of facts.versions) {
    const label = fr.masterJourney.versionLabel[v.stage];
    if (v.declared) {
      items.push({
        key: `${v.id}-declared`,
        step: "source",
        text: t.existingMix(v.fileName),
        who: v.decidedBy,
        at: v.createdAt,
        cause: null,
      });
      continue;
    }
    items.push({
      key: `${v.id}-dep`,
      step: v.stage,
      text: t.deposited(label, v.number, titleOf(v.masterId)),
      who: v.createdBy ?? linked(engineerOf(v.stage)),
      at: v.createdAt,
      cause: null,
    });
    if (v.feedbackSentAt)
      items.push({
        key: `${v.id}-fb`,
        step: v.stage,
        text: t.feedbackSent(label, v.number),
        who: null,
        at: v.feedbackSentAt,
        cause: null,
      });
    if (v.decision && v.decidedAt) {
      items.push({
        key: `${v.id}-dec`,
        step: v.stage,
        text:
          v.decision === "changes_requested"
            ? t.changes(label, v.number)
            : t.approved(label, v.number),
        who: v.decidedBy,
        at: v.decidedAt,
        cause: null,
      });
      if (v.reopenedAt)
        items.push({
          key: `${v.id}-reopen`,
          step: v.stage,
          text: t.reopened(label, v.reopenReason ?? ""),
          who: null,
          at: v.reopenedAt,
          cause: null,
        });
      if (v.decision === "approved" && v.stage === "mastering")
        items.push({
          key: `${v.id}-cat`,
          step: "final",
          text: t.catalogued(v.number),
          who: t.pdsName,
          at: v.decidedAt,
          cause: t.after.approved(label, v.number),
        });
    }
  }

  for (const r of facts.received)
    items.push({
      key: `rec-${r.masterId}-${r.deliverable}`,
      step: "final",
      text: t.deliverable(
        fr.masterWorkflow.brief.deliverables[
          r.deliverable as keyof typeof fr.masterWorkflow.brief.deliverables
        ] ?? r.deliverable,
      ),
      who: r.by,
      at: r.at,
      cause: null,
    });

  const b = facts.brief;
  for (const [stage, person, at] of [
    ["mix", b?.mixPerson, b?.mixAssignedAt],
    [
      "mastering",
      b?.masteringSame ? b?.mixPerson : b?.masteringPerson,
      b?.masteringAssignedAt,
    ],
  ] as const)
    if (person && at)
      items.push({
        key: `assigned-${stage}`,
        step: stage,
        text: fr.masterInHouse.history.assigned(person.name, stage),
        who: null,
        at,
        cause: null,
      });

  facts.messages.forEach((m, i) => {
    if (m.escalatedAt)
      items.push({
        key: `esc-${i}`,
        step: m.stage,
        text: fr.masterDelay.history.escalated,
        who: null,
        at: m.escalatedAt,
        cause: null,
      });
  });

  const ti = fr.masterInvoice.history;
  for (const i of facts.invoices) {
    items.push({
      key: `inv-${i.id}`,
      step: "final",
      text: ti.requested(i.contactName),
      who: t.pdsName,
      at: i.requestedAt,
      cause: ti.requestedCause,
    });
    if (i.receivedAt && i.number && i.amountCents !== null)
      items.push({
        key: `inv-${i.id}-rec`,
        step: "final",
        text: ti.received(
          i.number,
          i.contactName,
          i.viaLink,
          eurosHt(i.amountCents),
        ),
        who: i.viaLink ? linked(i.contactName) : i.receivedBy,
        at: i.receivedAt,
        cause: ti.receivedCause,
      });
    if (i.receivedAt && i.bankChanged && i.number)
      items.push({
        key: `inv-${i.id}-rib`,
        step: "final",
        text: ti.ribChanged(i.contactName),
        who: t.pdsName,
        at: i.receivedAt,
        cause: ti.ribCause(i.number),
      });
    if (i.paidOn && i.paidAt && i.receivedAt && i.number)
      items.push({
        key: `inv-${i.id}-paid`,
        step: "final",
        text: ti.paid(
          i.number,
          i.contactName,
          formatDay(i.paidOn),
          eurosHt(i.amountCents ?? 0),
        ),
        who: i.paidBy,
        at: i.paidAt,
        cause: ti.paidCause(formatShortInstant(i.receivedAt)),
      });
  }

  return items.sort((a, b) => a.at.localeCompare(b.at));
}

/** The people who appear in the history, for its filter. */
export const historyPeople = (items: MasterHistoryItem[]) =>
  [...new Set(items.flatMap((i) => (i.who ? [i.who] : [])))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
