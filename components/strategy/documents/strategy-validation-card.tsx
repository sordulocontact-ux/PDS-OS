import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { stageTone } from "@/lib/ui/state-tones";

/**
 * The strategy's validation, beside the pilotage: its stage state and the
 * way to the Brief de sortie, where the validation is asked, decided and
 * followed (ticket § 9). The generic stage panel does not decide a strategy:
 * the database refuses it (validations_strategy_guard).
 */
export function StrategyValidationCard({
  projectId,
  stageState,
  revisionOpen,
}: {
  projectId: string;
  stageState: string;
  revisionOpen: boolean;
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
      <ViewLink
        href={routes.projectStrategyBrief(projectId)}
        className="text-sm underline underline-offset-2"
      >
        {fr.strategyBrief.openBrief}
      </ViewLink>
    </div>
  );
}
