import { IconLayers } from "nucleo-sharp-essential";

import { ActivationsCounters } from "@/components/activations/activations-counters";
import { ActivationsHeader } from "@/components/activations/activations-header";
import { ActivationsTable } from "@/components/activations/activations-table";
import { AttachSection } from "@/components/activations/attach-section";
import { NewActivationButton } from "@/components/activations/new-activation-button";
import { ProjectPageActions } from "@/components/projects/project-page-actions";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { loadAttachables } from "@/lib/activations/attachables";
import { loadActivationsBoard } from "@/lib/activations/board";
import { ACTIVATION_KINDS, asOf } from "@/lib/activations/model";
import { ACTIVATION_VIEWS } from "@/lib/activations/states";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.activations;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * Marketing › Activations: every activation of the project, whatever its
 * nature or mode (ticket « Activations — Vue d'ensemble et pilotage »,
 * docs/ARCHITECTURE.md § 8 duodecies). Views and type in the URL; states,
 * counters and next actions computed by code at each visit.
 */
export default async function ProjectActivationsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/activations">) {
  const { projectId } = await params;
  const query = await searchParams;
  const [access, project, board] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    loadActivationsBoard(projectId),
  ]);
  const [members, attachables] = await Promise.all([
    loadMembers(access),
    loadAttachables(projectId, board.summaries),
  ]);
  const canCreate = canEditProject(access, project);
  const view = asOf(ACTIVATION_VIEWS, query.view);
  const kind = asOf(ACTIVATION_KINDS, query.kind);
  const path = routes.projectActivations(projectId);
  const all = board.summaries;
  const ofKind = kind ? all.filter((a) => a.kind === kind) : all;
  const rows = view ? ofKind.filter((a) => a.views.includes(view)) : ofKind;
  const marketingClosed = project.stages.some(
    (s) => s.key === "review" && s.state === "validated",
  );

  return (
    <div className="grid gap-6">
      {canCreate && (
        <ProjectPageActions>
          <NewActivationButton
            projectId={projectId}
            members={members}
            defaultOwnerId={project.ownerPersonId}
          />
        </ProjectPageActions>
      )}
      {all.length === 0 ? (
        <EmptyState icon={IconLayers} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <>
          <ActivationsHeader
            rows={all}
            ownerName={project.ownerName}
            marketingClosed={marketingClosed}
          />
          <ActivationsCounters rows={all} />
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t.kindFilter}
          >
            <FilterChipLink
              href={viewHref(path, { view })}
              current={kind === null}
            >
              {t.kindAll}
            </FilterChipLink>
            {ACTIVATION_KINDS.filter((k) => all.some((a) => a.kind === k)).map(
              (k) => (
                <FilterChipLink
                  key={k}
                  href={viewHref(path, { view, kind: k })}
                  current={kind === k}
                >
                  {t.kinds[k]}
                </FilterChipLink>
              ),
            )}
          </div>
          <DataTableViews
            label={t.views.label}
            views={[
              {
                label: t.views.all,
                count: ofKind.length,
                current: view === null,
                href: viewHref(path, { kind }),
              },
              ...ACTIVATION_VIEWS.map((v) => ({
                label: t.views[v],
                count: ofKind.filter((a) => a.views.includes(v)).length,
                current: view === v,
                href: viewHref(path, { view: v, kind }),
              })),
            ]}
          >
            {rows.length === 0 ? (
              <EmptyNote>{t.emptyView}</EmptyNote>
            ) : (
              <ActivationsTable
                projectId={projectId}
                rows={rows}
                members={members}
              />
            )}
          </DataTableViews>
        </>
      )}
      <AttachSection
        projectId={projectId}
        items={attachables}
        members={members}
        canCreate={canCreate}
        defaultOwnerId={project.ownerPersonId}
      />
    </div>
  );
}
