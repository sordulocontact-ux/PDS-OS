import { notFound, redirect } from "next/navigation";

import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { AddReferencesDialog } from "@/components/design/references/add-references-dialog";
import { ReferenceSection } from "@/components/design/references/reference-section";
import { SimilarReferencesDialog } from "@/components/design/references/similar-references-dialog";
import { EmptyNote } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadConception } from "@/lib/design/conception";
import { DIRECTION_TARGET, targetKeyOf } from "@/lib/design/reference-rules";
import { loadReferenceViews } from "@/lib/design/references";
import { moodboardIsRead } from "@/lib/design/similar-references";
import { similarBases } from "@/lib/design/similar-rules";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionRefs.title} · ${fr.app.name}`,
};

/**
 * Conception, étape 6: moodboards and references. One resource (a file or
 * a link) serves any number of targets — the direction, deliverables — and
 * one with no target waits « à rattacher ». No global moodboard imposed:
 * a whole moodboard, separate references, or both. A reference stays a
 * proposal until a validated section of the direction carries it. PO can
 * look for similar images on Are.na; a human keeps them.
 */
export default async function DesignReferencesPage({
  params,
}: PageProps<"/app/projects/[projectId]/design/references">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  if (!isStageValidated(project.stages, "launch_strategy"))
    return (
      <DesignNeedsStrategy
        projectId={projectId}
        canEdit={canEditProject(access, project)}
      />
    );
  const data = await loadConception(project, access);
  if (!data) notFound();
  if (!data.started) redirect(routes.projectDesign(projectId));
  const references = await loadReferenceViews(projectId, data.references);

  const t = fr.conceptionRefs;
  const targets = [
    { key: DIRECTION_TARGET, label: t.direction },
    ...data.deliverables.map((d) => ({ key: d.id, label: d.title })),
  ];
  const serving = (key: string) =>
    references.filter((r) => r.links.some((l) => targetKeyOf(l) === key));
  const unattached = references.filter((r) => r.links.length === 0);
  const section = {
    projectId,
    targets,
    canWrite: data.canWrite,
  };

  return (
    <div className="flex flex-col gap-10 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-3">
        <h2 className="text-display-sm font-semibold">{t.title}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {data.canWrite ? t.description : t.readOnly}
        </p>
        {data.canWrite && (
          <div className="flex flex-wrap gap-2">
            <AddReferencesDialog
              organizationId={data.organizationId}
              projectId={projectId}
              options={targets}
            />
            <SimilarReferencesDialog
              projectId={projectId}
              bases={similarBases(
                data.references,
                targets,
                t.similar.allImages,
              )}
              options={targets}
              reads={moodboardIsRead()}
            />
          </div>
        )}
      </header>

      {references.length === 0 && <EmptyNote>{t.empty}</EmptyNote>}
      {unattached.length > 0 && (
        <ReferenceSection
          id="references-unattached"
          title={t.unattached}
          description={t.unattachedHint}
          references={unattached}
          currentKey={null}
          {...section}
        />
      )}
      {references.length > 0 &&
        targets.map((target) => (
          <ReferenceSection
            key={target.key}
            id={`references-${target.key}`}
            title={target.label}
            description={
              target.key === DIRECTION_TARGET ? t.directionHint : undefined
            }
            references={serving(target.key)}
            currentKey={target.key}
            {...section}
          />
        ))}
    </div>
  );
}
