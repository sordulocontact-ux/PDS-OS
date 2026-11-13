import { StatTiles } from "@/components/ui/stat-tiles";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import {
  titleWaitings,
  type MasterTitleScope,
} from "@/lib/master-workflow/title-scope";

const fr = { masterJourney };

// Names under a count: the first two, then how many more (the tiles of a
// row keep close heights on a phone).
const SHOWN = 2;

/**
 * The Master's overview of a collective (lot 9 of docs/pds-mic-plan.md), at
 * the head of every step: how many titles wait for their source, a mix, a
 * mastering or a validation, their names under the figure; a figure opens
 * the first of its titles on its step. The abandoned titles are out.
 */
export function TitlesOverview({
  projectId,
  scope,
}: {
  projectId: string;
  scope: MasterTitleScope;
}) {
  const t = fr.masterJourney.overview;
  return (
    <section aria-label={t.label}>
      <StatTiles
        stats={titleWaitings(projectId, scope).map((w) => ({
          label: t[w.kind],
          value: String(w.count),
          href: w.href ?? undefined,
          hint:
            w.names.length === 0
              ? t.none
              : [
                  w.names.slice(0, SHOWN).join(", "),
                  w.names.length > SHOWN ? t.more(w.names.length - SHOWN) : "",
                ]
                  .filter(Boolean)
                  .join(" "),
        }))}
      />
    </section>
  );
}
