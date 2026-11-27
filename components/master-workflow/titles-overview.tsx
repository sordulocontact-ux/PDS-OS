import { StepSection } from "@/components/shell/journey/step-section";
import { StatCards } from "@/components/ui/stat-cards";
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
 * the foot of every step under its own title — never between a title's step
 * and its content, where it read as part of that step (Sacha, 27/11/2026):
 * how many titles wait for their source, a mix, a mastering or a
 * validation, their names under the figure, a wait no title has left out
 * (no « 0 · Aucun titre »); a figure opens the first of its titles on its
 * step. The abandoned titles are out.
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
  const waitings = titleWaitings(projectId, scope).filter((w) => w.count > 0);
  if (waitings.length === 0) return null;
  return (
    <StepSection
      title={t.label}
      aside={
        canRequest &&
        waitingSource.length > 0 && (
          <RequestFilesButton
            projectId={projectId}
            titles={waitingSource.map((c) => ({
              titleId: c.titleId,
              label: c.label,
              askedOf: c.request?.name ?? null,
            }))}
            recipients={recipients}
          />
        )
      }
    >
      <StatCards
        stats={waitings.map((w) => {
          // « dont N demandés » takes a name's room (close heights).
          const shown = w.requested > 0 ? SHOWN - 1 : SHOWN;
          const names =
            w.names.length === 0
              ? t.none
              : [
                  w.names.slice(0, shown).join(", "),
                  w.names.length > shown ? t.more(w.names.length - shown) : "",
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
    </StepSection>
  );
}
