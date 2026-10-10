import {
  BriefBlock,
  BriefEmpty,
} from "@/components/strategy/brief/brief-block";
import { BriefToDecide } from "@/components/strategy/brief/brief-to-decide";
import { FactList } from "@/components/ui/fact-list";
import { sectionCardClass } from "@/components/ui/section-card";
import { fr } from "@/lib/i18n/fr";
import type {
  BriefSnapshot,
  SnapshotItem,
} from "@/lib/strategy/documents/brief-snapshot";
import { cn } from "@/lib/utils";

/**
 * A Brief de sortie as a snapshot: what remains to arbitrate first, then
 * the eight dimensions. The live Brief and every stored version (V1, V2…)
 * render through it, so a version reads exactly as it was sent.
 * `projectId` null: a frozen version, its lines lead nowhere.
 */
export function BriefSnapshotView({
  snapshot,
  projectId,
}: {
  snapshot: BriefSnapshot;
  projectId: string | null;
}) {
  return (
    <>
      <BriefToDecide projectId={projectId} items={snapshot.toDecide} />
      <article
        aria-label={fr.strategyBrief.title}
        className={cn(sectionCardClass, "flex flex-col gap-8")}
      >
        {snapshot.sections.map((section, index) => (
          <BriefBlock
            key={section.dimension}
            dimension={section.dimension}
            index={index}
            toDecide={section.toDecide}
          >
            <SnapshotItems items={section.items} />
          </BriefBlock>
        ))}
      </article>
    </>
  );
}

function SnapshotItems({ items }: { items: SnapshotItem[] }) {
  // Labelled answers side by side; plain ones as text and lines.
  const facts = items.filter((i) => i.label !== null && i.lines.length === 0);
  const plain = items.filter((i) => !facts.includes(i));
  return (
    <>
      {facts.length > 0 && (
        <FactList
          emptyLabel={fr.strategyBrief.sections.empty}
          facts={facts.map((i) => ({ label: i.label!, value: i.value }))}
        />
      )}
      {plain.map((item, index) =>
        item.value === null && item.lines.length === 0 ? (
          <BriefEmpty key={index}>{item.empty}</BriefEmpty>
        ) : (
          <div key={index} className="flex flex-col gap-1">
            {item.value !== null && (
              <p className="whitespace-pre-wrap tabular-nums">{item.value}</p>
            )}
            {item.lines.length > 0 && (
              <ul className="flex flex-col gap-1 tabular-nums">
                {item.lines.map((line, i) => (
                  <li
                    key={i}
                    className={cn(
                      line.warn && "text-[color:var(--tone-warning-fg)]",
                    )}
                  >
                    {line.head && (
                      <span className="font-semibold">{line.head} </span>
                    )}
                    {line.rest && (
                      <span
                        className={cn(
                          line.head && !line.warn && "text-muted-foreground",
                        )}
                      >
                        {line.head ? `· ${line.rest}` : line.rest}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ),
      )}
    </>
  );
}
