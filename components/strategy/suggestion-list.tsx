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
    <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
      <ul className="grid gap-3">
        {suggestions.map((s) => (
          <li key={s.choice} className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{labels[s.choice]}</span>
              <ProposedBadge />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.from(s.sourceLabel)} : « {s.quote} »
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
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
            </div>
          </li>
        ))}
      </ul>
      {suggestions.length > 1 && (
        <Button
          size="sm"
          variant="outline"
          className="justify-self-start"
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
