import { sectionTitleClass } from "@/components/strategy/option-class";
import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/strategy/choices";

// A Strategy question for anyone who only reads: the chosen answers in blue,
// then the answer text.
export function ChoicesReadOnly({
  field,
  value,
  text,
}: {
  field: StrategyTextField;
  value: ChoiceValue;
  text: string | null;
}) {
  const t = fr.strategy.choices;
  const labels: Record<string, string> = t.options[field];
  const chosen = [
    ...value.choices.map((c) => labels[c]),
    ...(value.other ? [value.other] : []),
  ];

  return (
    <section className="flex flex-col gap-4">
      <h3 className={sectionTitleClass}>{t.questions[field]}</h3>
      {chosen.length === 0 && !text ? (
        <p className="text-body-md text-muted-foreground">{t.none}</p>
      ) : (
        <>
          {chosen.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {chosen.map((label) => (
                <li
                  key={label}
                  className="rounded-pill border border-[var(--selection-border)] bg-[var(--selection-bg)] px-3.5 py-1.5 text-sm font-medium"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
          {text && <p className="text-body-md whitespace-pre-wrap">{text}</p>}
        </>
      )}
    </section>
  );
}
