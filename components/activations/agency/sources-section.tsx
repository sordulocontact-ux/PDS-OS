import { FactRow, FactRows } from "@/components/ui/fact-row";
import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import type { AgencySourceRecord } from "@/lib/activations/agency/queries";
import type { ActivationScope } from "@/lib/activations/types";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { formatDateTime } from "@/lib/release/format";

import { RefreshButton } from "./refresh-button";
import {
  AddSourceButton,
  ImportMetricsButton,
  ManualRowButton,
} from "./source-buttons";

const fr = { activationAgency };

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
    <ActivationSection
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
        <FactRows>
          {sources.map((s) => (
            <FactRow
              key={s.id}
              value={`${s.label} · ${t.kinds[s.kind]}`}
              source={
                s.lastSnapshot
                  ? t.last(
                      formatDateTime(s.lastSnapshot.takenAt),
                      t.statuses[
                        s.lastSnapshot.status as keyof typeof t.statuses
                      ],
                    )
                  : t.never
              }
              side={
                canWrite && (
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
                )
              }
              below={
                (s.url || s.kind === "manual") && (
                  <span className="flex flex-col gap-0.5 text-caption text-[color:var(--text-secondary)]">
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.openSource}
                      </a>
                    )}
                    {s.kind === "manual" && <span>{t.pdfNote}</span>}
                  </span>
                )
              }
            />
          ))}
        </FactRows>
      )}
    </ActivationSection>
  );
}
