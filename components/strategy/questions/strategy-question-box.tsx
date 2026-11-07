import { LeverQuestion } from "@/components/strategy/questions/lever-question";
import { TextQuestion } from "@/components/strategy/questions/text-question";
import type { PoQuestionNav } from "@/components/ui/po-question";
import { routes } from "@/lib/auth/redirects";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import {
  walkedQuestions,
  type StrategyQuestion,
} from "@/lib/strategy/questions";

const fr = { strategyDimensions };

/**
 * PO's one question above « Les 8 dimensions » (as the Cadrage's, Sacha
 * 06/11/2026): the dimension it belongs to, « ‹ 3 sur 9 › » to walk the
 * others (one URL each), then the written point or the lever to arbitrate.
 */
export function StrategyQuestionBox({
  projectId,
  queue,
  current,
}: {
  projectId: string;
  queue: StrategyQuestion[];
  current: StrategyQuestion;
}) {
  const walked = walkedQuestions(queue, current);
  const at = walked.findIndex((q) => q.key === current.key);
  const href = (q: StrategyQuestion | undefined) =>
    q ? routes.projectStrategyQuestion(projectId, q.key) : null;
  const nav: PoQuestionNav = {
    position: at + 1,
    total: walked.length,
    previous: href(walked[at - 1]),
    next: href(walked[at + 1]),
  };
  const eyebrow = fr.strategyDimensions.names[current.dimension];
  const afterHref = routes.projectStrategyAfter(projectId, current.key);
  return current.kind === "text" ? (
    <TextQuestion
      key={`${current.key}-${current.proposed}`}
      projectId={projectId}
      question={current}
      eyebrow={eyebrow}
      nav={nav}
      selfHref={routes.projectStrategyQuestion(projectId, current.key)}
      afterHref={afterHref}
    />
  ) : (
    <LeverQuestion
      key={current.key}
      projectId={projectId}
      question={current}
      eyebrow={eyebrow}
      nav={nav}
      afterHref={afterHref}
    />
  );
}
