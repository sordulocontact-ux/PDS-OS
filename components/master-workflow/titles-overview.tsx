import { StatTiles } from "@/components/ui/stat-tiles";
import { RequestFilesButton } from "@/components/master-workflow/file-requests/request-files-button";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { loadFileRequestRecipients } from "@/lib/master-workflow/file-requests";
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
 * Lot 9 bis: among the titles waiting for their source, how many are asked
 * of someone, and « Demander des fichiers » for the owner.
 */
export async function TitlesOverview({
  projectId,
  scope,
  canRequest,
}: {
  projectId: string;
  scope: MasterTitleScope;
  // The project's owner: asks for files.
  canRequest: boolean;
}) {
  const t = fr.masterJourney.overview;
  const waitingSource = scope.choices.filter(
    (c) => c.waiting?.kind === "source",
  );
  const recipients =
    canRequest && waitingSource.length > 0
      ? await loadFileRequestRecipients(projectId)
      : [];
  return (
    <section aria-label={t.label} className="flex flex-col gap-3">
      <StatTiles
        stats={titleWaitings(projectId, scope).map((w) => {
          const names =
            w.names.length === 0
              ? t.none
              : [
                  w.names.slice(0, SHOWN).join(", "),
                  w.names.length > SHOWN ? t.more(w.names.length - SHOWN) : "",
                ]
                  .filter(Boolean)
                  .join(" ");
          return {
            label: t[w.kind],
            value: String(w.count),
            href: w.href ?? undefined,
            hint:
              w.requested > 0
                ? `${t.requested(w.requested)} · ${names}`
                : names,
          };
        })}
      />
      {canRequest && waitingSource.length > 0 && (
        <RequestFilesButton
          projectId={projectId}
          titles={waitingSource.map((c) => ({
            titleId: c.titleId,
            label: c.label,
            askedOf: c.request?.name ?? null,
          }))}
          recipients={recipients}
        />
      )}
    </section>
  );
}
