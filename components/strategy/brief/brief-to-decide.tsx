import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { strategyBrief } from "@/lib/i18n/fr/strategy-brief";
import type { Arbitration } from "@/lib/strategy/brief";

const fr = { strategyBrief };

/**
 * What the Brief still leaves to arbitrate, and only that (ticket § 8), said
 * before the document as the Brief de sortie says it (a warning callout,
 * never inside the card): each line opens its dimension's work panel — not
 * in a frozen version (`projectId` null). Nothing left: one quiet line.
 */
export function BriefToDecide({
  projectId,
  items,
}: {
  projectId: string | null;
  items: Arbitration[];
}) {
  const t = fr.strategyBrief.toDecide;
  if (items.length === 0)
    return <ToneCallout tone="success">{t.none}</ToneCallout>;
  return (
    <ToneCallout tone="warning" as="div">
      <span className="flex flex-col gap-1">
        <strong className="font-semibold">{t.title}</strong>
        <ul className="list-disc pl-5">
          {items.map((item) => (
            <li key={item.key}>
              {projectId ? (
                <ViewLink
                  href={routes.projectStrategyDimension(
                    projectId,
                    item.dimension,
                  )}
                  className="underline-offset-2 hover:underline"
                >
                  {item.text}
                </ViewLink>
              ) : (
                item.text
              )}
            </li>
          ))}
        </ul>
      </span>
    </ToneCallout>
  );
}
