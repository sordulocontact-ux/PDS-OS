import Link from "next/link";

import { MixVersionItem } from "@/components/master-workflow/mix-version-item";
import { TitleFileButton } from "@/components/master-workflow/title-file-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { MixVersionsView } from "@/lib/master-workflow/mix-types";

/**
 * The versions of the mix, title by title: "Ajouter une version" adds the
 * file received from the engineer at the "mix" state (the title's own audio
 * import), the database creates the version and notifies the team; then
 * each version with its feedback. The versions of a project start with its
 * Brief Mix/Master (the database only creates them for a project that has
 * one): until it is saved, the section says so instead of offering an
 * import that would create nothing.
 */
export function MixVersionsSection({
  projectId,
  view,
  canEdit,
  organizationId,
  hasBrief,
}: {
  projectId: string;
  view: MixVersionsView;
  canEdit: boolean;
  organizationId: string | null;
  hasBrief: boolean;
}) {
  const { titles, failed } = view;
  const t = fr.masterWorkflow.mixVersions;
  const s = t.stages[view.stage];
  if (failed) return <EmptyNote>{fr.facts.failed}</EmptyNote>;
  if (titles.length === 0) return <EmptyNote>{fr.facts.noMasters}</EmptyNote>;
  if (!hasBrief)
    return (
      <EmptyNote>
        {t.needsBrief}{" "}
        <Link
          href={routes.projectMasterStep(projectId, "brief")}
          className="underline underline-offset-4"
        >
          {t.openBrief}
        </Link>
      </EmptyNote>
    );
  return (
    <div className="grid gap-10">
      {titles.map((title) => (
        <section key={title.masterId} className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid gap-0.5">
              <h3 className="text-base font-medium">{title.title}</h3>
              <p className="text-caption text-[color:var(--text-secondary)]">
                {title.finalNumber !== null
                  ? s.final(title.finalNumber)
                  : view.decider && t.decider(view.decider)}
              </p>
            </div>
            {canEdit && organizationId && (
              <TitleFileButton
                organizationId={organizationId}
                label={t.add}
                action={{
                  kind: "add_audio",
                  masterId: title.masterId,
                  // The state the engineer delivers at this stage.
                  defaultState: view.stage === "mix" ? "mix" : "master",
                }}
              />
            )}
          </div>
          {title.versions.length === 0 ? (
            <EmptyNote>{canEdit ? s.emptyHint : t.empty}</EmptyNote>
          ) : (
            <div className="grid gap-8">
              {title.versions.map((version, index) => (
                <MixVersionItem
                  key={version.id}
                  projectId={projectId}
                  title={title.title}
                  version={version}
                  canEdit={canEdit}
                  decision={{
                    // Newest first: the first one is the latest.
                    isLatest: index === 0,
                    canDecide: view.canDecide,
                    finalNumber: title.finalNumber,
                    stage: view.stage,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
