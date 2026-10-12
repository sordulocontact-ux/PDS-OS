import Link from "next/link";

import { DeliverablesChecklist } from "@/components/master-workflow/deliverables-checklist";
import { AudioFile } from "@/components/ui/audio-file";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import { finalLabel, type FinalView } from "@/lib/master-workflow/final";

/**
 * The Master final step (ticket § 13): each title's validated Master final,
 * its state in the Catalogue, the other deliverables to check off, and what
 * Distribution will read once it exists.
 */
export function FinalPage({ view }: { view: FinalView }) {
  const t = fr.masterWorkflow.final;
  const allDone =
    view.titles.length > 0 &&
    view.titles.every((title) => title.final || title.before);
  const allBefore = allDone && view.titles.every((title) => !title.final);
  return (
    <div className="grid gap-8">
      <ToneCallout tone={allDone ? "success" : "info"}>
        {allBefore ? t.allBefore : allDone ? t.allDone : t.waiting}
      </ToneCallout>
      {view.failed ? (
        <EmptyNote>{fr.facts.failed}</EmptyNote>
      ) : view.titles.length === 0 ? (
        <EmptyNote>{fr.facts.noMasters}</EmptyNote>
      ) : (
        view.titles.map((title) => (
          <PageSection
            key={title.id}
            id={`final-${title.id}`}
            title={title.title}
            description={title.artists}
            card
          >
            <div className="grid gap-6">
              {(title.final ?? title.before) && (
                <AudioFile
                  label={t.listen(title.title)}
                  listenUrl={(title.final ?? title.before)!.listenUrl}
                  downloadUrl={(title.final ?? title.before)!.downloadUrl}
                />
              )}
              <FactList
                emptyLabel={t.noFinal}
                facts={[
                  {
                    label: t.facts.final,
                    value: title.final
                      ? t.version(title.final.number, title.final.fileName)
                      : (title.before?.fileName ?? null),
                  },
                  {
                    label: t.facts.validated,
                    value: title.final
                      ? t.validated(
                          formatDateTime(title.final.decidedAt),
                          title.final.decidedBy,
                        )
                      : title.before
                        ? t.before(formatDateTime(title.before.addedAt))
                        : null,
                  },
                  // The Brief's engineer did not master a file that came before.
                  ...(title.before
                    ? []
                    : [{ label: t.facts.engineer, value: view.engineer }]),
                  {
                    label: t.facts.catalogue,
                    // Said attached only once the Catalogue really says so
                    // (PROJ-BUG-10).
                    value:
                      title.audioState === "final_master" &&
                      (title.final ?? title.before)
                        ? t.attached
                        : finalLabel(title.audioState),
                  },
                  {
                    label: t.facts.lineage,
                    value:
                      [
                        title.lineage.source &&
                          t.lineageSource(title.lineage.source.fileName),
                        title.lineage.mixFinal &&
                          t.lineageMix(
                            title.lineage.mixFinal.number,
                            title.lineage.mixFinal.fileName,
                          ),
                      ]
                        .filter(Boolean)
                        .join(" → ") || null,
                  },
                ]}
              />
              <DeliverablesChecklist
                projectId={view.projectId}
                masterId={title.id}
                deliverables={title.deliverables}
                canEdit={view.canEdit}
              />
            </div>
          </PageSection>
        ))
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-[color:var(--text-secondary)]">
          {allDone ? t.nextDistribution : t.distribution}
        </p>
        {allDone && (
          <Link
            href={routes.projectRelease(view.projectId)}
            className={buttonVariants({ size: "sm" })}
          >
            {t.toDistribution}
          </Link>
        )}
      </div>
    </div>
  );
}
