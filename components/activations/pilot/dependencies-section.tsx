import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
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
    <ActivationSection
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
        <FactRows>
          {dependencies.map((d) => (
            <FactRow
              key={d.id}
              value={
                d.href ? (
                  <ViewLink
                    href={d.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {d.label}
                  </ViewLink>
                ) : (
                  d.label
                )
              }
              source={
                [d.blocking ? t.blocking : null, d.changed ? t.changed : null]
                  .filter(Boolean)
                  .join(" · ") || null
              }
              state={{
                tone:
                  d.resolved === null
                    ? "neutral"
                    : d.resolved
                      ? "success"
                      : d.blocking
                        ? "warning"
                        : "neutral",
                label:
                  d.resolved === null
                    ? t.unknown
                    : d.resolved
                      ? t.resolved
                      : t.open,
              }}
              side={
                canWrite && (
                  <UnlinkDependencyButton
                    projectId={projectId}
                    dependencyId={d.id}
                    label={d.label}
                  />
                )
              }
            />
          ))}
        </FactRows>
      )}
    </ActivationSection>
  );
}
