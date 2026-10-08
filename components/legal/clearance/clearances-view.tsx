import { ClearanceDrawer } from "@/components/legal/clearance/clearance-drawer";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { missingLabel } from "@/lib/legal/clearance/matrix";
import type { Clearances } from "@/lib/legal/clearance/types";
import { clearanceTone } from "@/lib/ui/state-tones";

/** Accords of a project (ticket Juridique 05): each element to secure, its
 * state, its next action, what it still lacks; the drawer for the rest. */
export function ClearancesView({
  projectId,
  clearances,
  openId = null,
}: {
  projectId: string;
  clearances: Clearances;
  // `?emprunt=`: the borrowing a notification points at, opened at once.
  openId?: string | null;
}) {
  const t = fr.legalClearance;
  const { items, ...context } = clearances;
  return (
    <div className="grid gap-8">
      <ProjectPageHeader
        title={t.page.title}
        description={t.page.description}
      />
      <PageSection card id="legal-clearances" title={t.page.title}>
        {items.length === 0 ? (
          <EmptyNote>{t.page.empty}</EmptyNote>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium break-words">« {c.work} »</span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      fr.legal.intake.facts.elements[
                        c.element as keyof typeof fr.legal.intake.facts.elements
                      ],
                      c.author,
                      c.title,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-sm break-words">
                    {t.next[c.status]}
                  </span>
                  {c.missing.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t.drawer.needs} {c.missing.map(missingLabel).join(" · ")}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {c.responsibleName
                      ? t.page.responsible(c.responsibleName)
                      : t.page.noResponsible}
                  </span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {c.status === "refused" && (
                    <StatusBadge tone="danger">{t.page.blocks}</StatusBadge>
                  )}
                  <StatusBadge tone={clearanceTone[c.status]}>
                    {t.statuses[c.status]}
                  </StatusBadge>
                  <ClearanceDrawer
                    projectId={projectId}
                    clearance={c}
                    context={context}
                    defaultOpen={c.id === openId}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
