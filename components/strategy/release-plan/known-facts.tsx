import { BlockFact, FactBlock, FactBlockRow } from "@/components/ui/fact-block";
import { Fold } from "@/components/ui/fold";
import { chipClass } from "@/components/ui/name-chip";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { KnownFact } from "@/lib/strategy/documents/plan-steps";
import { cn } from "@/lib/utils";

const fr = { strategyReleasePlan };

/**
 * « Déjà connu » of a generator's first screen (Plan de sortie, Dossier de
 * presse): what the validated strategy says, as a `FactBlock` — the label
 * above its value, two facts a row, a wide one alone — instead of long
 * texts in a table (Sacha, 10/11/2026). Lists as pills, the narrative's
 * angle with its other parts folded under it. Server-safe.
 */
export function KnownFacts({ facts }: { facts: KnownFact[] }) {
  // Two by two, a wide fact (or the last one left alone) on its own row.
  const rows: KnownFact[][] = [];
  for (const fact of facts) {
    const last = rows.at(-1);
    if (!fact.wide && last?.length === 1 && !last[0].wide) last.push(fact);
    else rows.push([fact]);
  }
  return (
    <FactBlock>
      {rows.map((row) =>
        row.length === 2 ? (
          <FactBlockRow key={row[0].key}>
            {row.map((fact) => (
              <Known key={fact.key} fact={fact} />
            ))}
          </FactBlockRow>
        ) : (
          <Known key={row[0].key} fact={row[0]} />
        ),
      )}
    </FactBlock>
  );
}

function Known({ fact }: { fact: KnownFact }) {
  const t = fr.strategyReleasePlan.intro;
  const items = fact.items ?? [];
  const parts = fact.parts ?? [];
  const empty = !fact.value && items.length === 0;
  return (
    <BlockFact label={fact.label}>
      <div className="flex min-w-0 flex-col gap-2">
        {empty ? (
          <span className="text-[color:var(--text-tertiary)]">
            {t.notProvided}
          </span>
        ) : (
          fact.value && <span className="text-pretty">{fact.value}</span>
        )}
        {items.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
              <li key={`${item}-${i}`} className={cn(chipClass, "px-3")}>
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        )}
        {parts.length > 0 && (
          <Fold summary={t.moreParts(parts.length)}>
            <dl className="flex flex-col gap-2.5 modern:gap-2">
              {parts.map((part) => (
                <div key={part.label} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-caption text-[color:var(--text-secondary)]">
                    {part.label}
                  </dt>
                  <dd className="font-medium break-words">{part.text}</dd>
                </div>
              ))}
            </dl>
          </Fold>
        )}
      </div>
    </BlockFact>
  );
}
