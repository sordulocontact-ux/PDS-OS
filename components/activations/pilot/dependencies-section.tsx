import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import type { DependencyOptions } from "@/lib/activations/dependency-options";
import type { DependencyRecord } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";

import {
  LinkDependencyButton,
  UnlinkDependencyButton,
} from "./dependency-buttons";

const fr = { activations };

const t = fr.activations.dependencies;

/** Links to existing objects, their state read at the source ; a source that
 * changed since it was linked is flagged, never rewritten. */
export function DependenciesSection({
  projectId,
  activationId,
  dependencies,
  options,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  dependencies: DependencyRecord[];
  options: DependencyOptions;
  canWrite: boolean;
}) {
  return (
    <PageSection
      id="dependencies"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <LinkDependencyButton
            projectId={projectId}
            activationId={activationId}
            options={options}
          />
        )
      }
    >
      {dependencies.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border bg-card">
          {dependencies.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                {d.href ? (
                  <ViewLink
                    href={d.href}
                    className="font-medium break-words underline-offset-4 hover:underline"
                  >
                    {d.label}
                  </ViewLink>
                ) : (
                  <span className="font-medium break-words">{d.label}</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {d.blocking ? t.blocking : null}
                  {d.changed && ` · ${t.changed}`}
                </span>
              </div>
              <span className="flex items-center gap-2">
                <StatusBadge
                  size="sm"
                  tone={
                    d.resolved === null
                      ? "neutral"
                      : d.resolved
                        ? "success"
                        : d.blocking
                          ? "warning"
                          : "neutral"
                  }
                >
                  {d.resolved === null
                    ? t.unknown
                    : d.resolved
                      ? t.resolved
                      : t.open}
                </StatusBadge>
                {canWrite && (
                  <UnlinkDependencyButton
                    projectId={projectId}
                    dependencyId={d.id}
                    label={d.label}
                  />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
