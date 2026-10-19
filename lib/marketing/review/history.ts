// « Déjà fait » of each step of the Suivi & bilan, and its whole history
// (proto journal: « Bilan Marketing V1 généré », « Bilan V1 soumis à … »,
// « Réserve « … » : à suivre après clôture », « Marketing rouvert · « … » »),
// read from the reports, their decisions, the reserves and the closings as
// recorded. Newest first. Pure, client-safe.

import type { StepHistoryItem } from "@/components/shell/journey/step-history";
import { fr } from "@/lib/i18n/fr";
import type { MarketingClosure } from "@/lib/marketing/closure/queries";
import type { Approval } from "@/lib/marketing/reports/approvals";
import type { ReportVersion } from "@/lib/marketing/reports/model";
import type { Reserve } from "@/lib/marketing/reserves/queries";
import type { ReviewStepKey } from "@/lib/ui/review-steps";

const t = fr.reviewJourney.history;
const decisions = fr.reviewJourney.reserves.decisions;

type Line = StepHistoryItem & { at: string };

const newest = (lines: Line[]) =>
  [...lines].sort((a, b) => b.at.localeCompare(a.at));

export function reviewHistory(facts: {
  reports: ReportVersion[];
  approvals: Approval[];
  reserves: Reserve[];
  closures: MarketingClosure[];
  validatorName: string | null;
}): Record<ReviewStepKey, StepHistoryItem[]> {
  const quote = (text: string | null) => (text ? t.quote(text) : "");
  const bilan: Line[] = [
    ...facts.reports.flatMap((r) => [
      {
        key: `gen:${r.id}`,
        text: t.generated(r.version),
        who: r.authorName,
        at: r.createdAt,
      },
      ...(r.submittedAt
        ? [
            {
              key: `sub:${r.id}`,
              text: t.submitted(
                r.version,
                facts.validatorName ?? fr.reviewJourney.bilan.noValidator,
              ),
              who: r.submitterName,
              at: r.submittedAt,
            },
          ]
        : []),
    ]),
    ...facts.approvals.map((a) => ({
      key: `dec:${a.id}`,
      text:
        t.decided(a.reportVersion, t.decisions[a.decision]) + quote(a.comment),
      who: a.validatorName,
      at: a.decidedAt,
    })),
  ];
  const reserves: Line[] = facts.reserves.flatMap((r) => [
    ...(r.arbitrated && r.decision
      ? [
          {
            key: `arb:${r.id}`,
            text: t.arbitrated(
              r.description,
              decisions[r.decision].toLowerCase(),
            ),
            who: r.arbitrated.by,
            at: r.arbitrated.at,
          },
        ]
      : []),
    ...(r.lifted
      ? [
          {
            key: `lift:${r.id}`,
            text: t.lifted(r.description),
            who: r.lifted.by,
            at: r.lifted.at,
          },
        ]
      : []),
  ]);
  const closure: Line[] = facts.closures.flatMap((c) => {
    const decided = c.decidedAt
      ? c.state === "changes_requested"
        ? t.closureChanges + quote(c.comment)
        : c.state === "postponed"
          ? t.closurePostponed + quote(c.comment)
          : t.closed(
              c.state === "reopened"
                ? null
                : c.state === "closed_with_reserves",
            )
      : null;
    return [
      {
        key: `req:${c.id}`,
        text: t.requested,
        who: c.requestedBy,
        at: c.requestedAt,
      },
      ...(decided && c.decidedAt
        ? [
            {
              key: `dec:${c.id}`,
              text: decided,
              who: c.decidedBy,
              at: c.decidedAt,
            },
          ]
        : []),
      ...(c.reopenedAt
        ? [
            {
              key: `reo:${c.id}`,
              text: t.reopened + quote(c.reopenReason),
              who: c.reopenedBy,
              at: c.reopenedAt,
            },
          ]
        : []),
    ];
  });
  return {
    bilan: newest(bilan),
    reserves: newest(reserves),
    closure: newest(closure),
  };
}
