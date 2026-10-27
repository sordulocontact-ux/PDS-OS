import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import type { ModuleFact } from "@/lib/ui/module-frame";

const fr = { moduleFrame };

export type { ModuleFact };

/** The line of facts under a module's title (docs/DESIGN.md § 4). */
export function ModuleFacts({
  facts,
  label = fr.moduleFrame.facts.label,
}: {
  facts: ModuleFact[];
  label?: string;
}) {
  if (facts.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className="flex flex-wrap gap-x-4.5 gap-y-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]"
    >
      {facts.map((fact) => (
        <li key={fact.key}>
          {fact.label ? (
            <>
              {fact.label}{" "}
              <b className="font-semibold text-[color:var(--text-primary)]">
                {fact.value}
              </b>
            </>
          ) : (
            fact.value
          )}
        </li>
      ))}
    </ul>
  );
}
