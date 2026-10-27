import { ToneCallout } from "@/components/ui/tone-callout";
import { productionShoot } from "@/lib/i18n/fr/production-shoot";
import type { ClosingBlocker } from "@/lib/production/shoot/blockers";
import { isReturnPending, type ReturnLine } from "@/lib/production/shoot/rules";

const fr = { productionShoot };

const t = fr.productionShoot.equipment;

const blockerText = (b: ClosingBlocker) =>
  b.kind === "not_returned"
    ? t.closingBlockers.notReturned(b.count)
    : t.closingBlockers.incident(b.title);

/** « Avant la clôture » (ticket, parcours 12): has everything been given
 * back, is there a problem to report — answered by code from the lines —
 * then what the administrative closing waits for. */
export function ClosingCheck({
  equipment,
  blockers,
}: {
  equipment: ReturnLine[];
  blockers: ClosingBlocker[];
}) {
  const notReturned = equipment.filter(isReturnPending).length;
  const incidents = equipment.filter((l) => l.status === "incident").length;
  const answers = [
    {
      question: t.closingQuestions.returned,
      answer:
        equipment.length === 0
          ? t.closingAnswers.none
          : notReturned === 0
            ? t.closingAnswers.allReturned
            : t.closingAnswers.notReturned(notReturned),
    },
    {
      question: t.closingQuestions.problem,
      answer:
        incidents > 0
          ? t.closingAnswers.incidents(incidents)
          : t.closingAnswers.noProblem,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t.closingTitle}</h3>
      <dl className="flex flex-col gap-2 text-sm">
        {answers.map((a) => (
          <div key={a.question} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{a.question}</dt>
            <dd className="font-medium">{a.answer}</dd>
          </div>
        ))}
      </dl>
      {blockers.length > 0 ? (
        <ToneCallout tone="warning">
          {t.closingBlocked} {blockers.map(blockerText).join(" ; ")}.
        </ToneCallout>
      ) : (
        <ToneCallout tone="success">{t.closingClear}</ToneCallout>
      )}
    </div>
  );
}
