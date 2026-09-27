import type { BriefFact } from "@/lib/framing/brief-summary";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** The Brief's facts side by side: surtitle label, value below. No divider. */
export function BriefFacts({
  facts,
  columns = 2,
}: {
  facts: BriefFact[];
  columns?: 2 | 4;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-8 gap-y-5",
        columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2",
      )}
    >
      {facts.map((fact) => (
        <div key={fact.key} className="flex min-w-0 flex-col gap-1">
          <dt className="text-caption text-muted-foreground">{fact.label}</dt>
          <dd
            className={cn(
              "text-body-md break-words",
              fact.value ? "font-semibold" : "text-muted-foreground",
            )}
          >
            {fact.value ?? fr.framingGuide.line.empty}
          </dd>
        </div>
      ))}
    </dl>
  );
}
