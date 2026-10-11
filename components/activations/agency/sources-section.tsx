import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import type { AgencySourceRecord } from "@/lib/activations/agency/queries";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";
import { formatDateTime } from "@/lib/release/format";

import { RefreshButton } from "./refresh-button";
import {
  AddSourceButton,
  ImportMetricsButton,
  ManualRowButton,
} from "./source-buttons";

const t = fr.activationAgency.sources;

/** The agency's sources, read only : each with its last read and the acts
 * that read it again, fill it by hand or import its figures. */
export function SourcesSection({
  scope,
  sources,
  press,
  canWrite,
}: {
  scope: ActivationScope;
  sources: AgencySourceRecord[];
  press: boolean;
  canWrite: boolean;
}) {
  return (
    <PageSection
      id="sources"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <AddSourceButton
            projectId={scope.projectId}
            activationId={scope.activationId}
          />
        )
      }
    >
      {sources.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border bg-card">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium break-words">
                  {s.label}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {t.kinds[s.kind]}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {s.lastSnapshot
                    ? t.last(
                        formatDateTime(s.lastSnapshot.takenAt),
                        t.statuses[
                          s.lastSnapshot.status as keyof typeof t.statuses
                        ],
                      )
                    : t.never}
                  {s.url && (
                    <>
                      {" · "}
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.openSource}
                      </a>
                    </>
                  )}
                </span>
                {s.kind === "manual" && (
                  <span className="text-xs text-muted-foreground">
                    {t.pdfNote}
                  </span>
                )}
              </div>
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  {s.kind !== "manual" && (
                    <RefreshButton
                      scope={scope}
                      sourceId={s.id}
                      kind={s.kind}
                      press={press}
                      mapping={s.mapping}
                      keyFields={s.keyFields}
                    />
                  )}
                  <ManualRowButton
                    projectId={scope.projectId}
                    sourceId={s.id}
                    press={press}
                  />
                  <ImportMetricsButton
                    projectId={scope.projectId}
                    activationId={scope.activationId}
                    sourceId={s.id}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
