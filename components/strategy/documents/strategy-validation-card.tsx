import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { DocumentReview } from "@/lib/strategy/documents/queries";
import { stageTone, strategyReviewTone } from "@/lib/ui/state-tones";

/**
 * The strategy's validation, beside the pilotage: its stage state and the
 * way to the Brief de sortie, where the validation is asked, decided and
 * followed (ticket § 9). While a version is under review, who must validate
 * it and where each stands (Sacha, 11/10/2026 : « comment savoir qui doit
 * valider ? »). The generic stage panel does not decide a strategy: the
 * database refuses it (validations_strategy_guard).
 */
export function StrategyValidationCard({
  projectId,
  stageState,
  revisionOpen,
  reviews,
}: {
  projectId: string;
  stageState: string;
  revisionOpen: boolean;
  // Who must validate : the reviewers of the Brief version sent.
  reviews: DocumentReview[];
}) {
  const states = fr.framing.validation.states;
  const label = (states as Record<string, string>)[stageState] ?? stageState;
  const text =
    stageState === "awaiting_validation"
      ? fr.strategyDocuments.review.waiting
      : revisionOpen
        ? fr.strategyBrief.requestFromBrief
        : stageState === "validated"
          ? null
          : fr.strategyBrief.requestFromBrief;
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{fr.strategy.validation.title}</h3>
        <StatusBadge tone={stageTone[stageState] ?? "neutral"}>
          {label}
        </StatusBadge>
      </div>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
      {reviews.length > 0 && (
        <div className="grid gap-2">
          <h4 className="text-sm font-medium">
            {fr.strategyDocuments.review.who}
          </h4>
          <ul className="grid gap-1.5">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium break-words">{r.name}</span>
                <StatusBadge tone={strategyReviewTone[r.state]} size="sm">
                  {fr.strategyDocuments.reviewStates[r.state]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ViewLink
        href={routes.projectStrategyBrief(projectId)}
        className="text-sm underline underline-offset-2"
      >
        {fr.strategyBrief.openBrief}
      </ViewLink>
    </div>
  );
}
