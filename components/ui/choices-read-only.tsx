import { sectionTitleClass } from "@/components/ui/option-class";

/**
 * A closed-choice question for anyone who only reads (Stratégie,
 * Conception): the chosen answers in blue, then the answer text.
 */
export function ChoicesReadOnly({
  question,
  chosen,
  text,
  empty,
}: {
  question: string;
  // Labels of the checked choices, then the « Autre » text.
  chosen: string[];
  text: string | null;
  // Shown when nothing is answered yet.
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className={sectionTitleClass}>{question}</h3>
      {chosen.length === 0 && !text ? (
        <p className="text-body-md text-muted-foreground">{empty}</p>
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
