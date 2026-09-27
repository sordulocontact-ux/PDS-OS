"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { Button } from "@/components/ui/button";
import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import {
  acceptStrategySuggestions,
  dismissStrategySuggestion,
} from "@/lib/strategy/actions/choices";
import type { ChoiceSuggestion } from "@/lib/strategy/choices";

// PO's pre-checked answers for one question, each with the passage that
// justifies it. Nothing counts as chosen until the owner accepts it.
export function SuggestionList({
  field,
  suggestions,
  projectId,
  onAccepted,
}: {
  field: StrategyTextField;
  suggestions: ChoiceSuggestion[];
  projectId: string;
  onAccepted: (choices: string[]) => void;
}) {
  const t = fr.strategy.choices;
  const labels: Record<string, string> = t.options[field];
  const { pending, run } = useFramingAction();

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {suggestions.map((s) => (
          <li
            key={s.choice}
            className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <ProposedBadge />
                <span className="text-body-md font-medium">
                  {labels[s.choice]}
                </span>
              </div>
              <p className="text-caption break-words text-muted-foreground">
                {t.from(s.sourceLabel)} : « {s.quote} »
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    dismissStrategySuggestion(projectId, field, s.choice),
                  )
                }
              >
                {t.dismiss}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      acceptStrategySuggestions(projectId, field, [s.choice]),
                    () => onAccepted([s.choice]),
                  )
                }
              >
                {t.accept}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {suggestions.length > 1 && (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          disabled={pending}
          onClick={() =>
            run(
              () => acceptStrategySuggestions(projectId, field, null),
              () => onAccepted(suggestions.map((s) => s.choice)),
            )
          }
        >
          {t.acceptAll}
        </Button>
      )}
    </div>
  );
}
