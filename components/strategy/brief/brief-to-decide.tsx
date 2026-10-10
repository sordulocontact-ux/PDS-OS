import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Arbitration } from "@/lib/strategy/brief";

/**
 * What the Brief still leaves to arbitrate, and only that (ticket § 8): each
 * line opens its dimension's work panel. Nothing left: one quiet line.
 */
export function BriefToDecide({
  projectId,
  items,
}: {
  projectId: string;
  items: Arbitration[];
}) {
  const t = fr.strategyBrief.toDecide;
  if (items.length === 0)
    return <ToneCallout tone="success">{t.none}</ToneCallout>;
  return (
    <section
      aria-labelledby="brief-to-decide"
      className="flex flex-col gap-2 rounded-2xl bg-[var(--tone-warning-bg)] px-4 py-3 text-[color:var(--tone-warning-fg)]"
    >
      <h2 id="brief-to-decide" className="text-body-md font-semibold">
        {t.title}
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md font-medium">
        {items.map((item) => (
          <li key={item.key}>
            <ViewLink
              href={routes.projectStrategyDimension(projectId, item.dimension)}
              className="underline-offset-2 hover:underline"
            >
              {item.text}
            </ViewLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
