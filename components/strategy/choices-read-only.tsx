import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/strategy/choices";

// The answers chosen for a Strategy question, for anyone who only reads.
export function ChoicesReadOnly({
  field,
  value,
}: {
  field: StrategyTextField;
  value: ChoiceValue;
}) {
  const t = fr.strategy.choices;
  const labels: Record<string, string> = t.options[field];
  const chosen = [
    ...value.choices.map((c) => labels[c]),
    ...(value.other ? [value.other] : []),
  ];

  return (
    <div className="grid gap-2 pt-4">
      <p className="text-sm text-muted-foreground">{t.questions[field]}</p>
      {chosen.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((label) => (
            <li
              key={label}
              className="rounded-pill bg-muted px-3 py-1 text-sm font-medium"
            >
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
