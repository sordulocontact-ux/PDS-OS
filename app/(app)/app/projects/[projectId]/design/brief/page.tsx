import { notFound, redirect } from "next/navigation";

import { BriefChecksList } from "@/components/design/brief/brief-checks-list";
import { BriefDocumentCard } from "@/components/design/brief/brief-document-card";
import { CreateBriefButton } from "@/components/design/brief/create-brief-button";
import { CreativeBriefView } from "@/components/design/brief/creative-brief-view";
import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { ValidationPanel } from "@/components/framing/validation-panel";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { sectionCardClass } from "@/components/ui/section-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime } from "@/lib/calls/format";
import { briefChanges } from "@/lib/design/brief-diff";
import { liveCreativeBrief } from "@/lib/design/brief-live";
import { briefRequestBlock, briefStatus } from "@/lib/design/brief-status";
import { loadCreativeBriefs, sameBrief } from "@/lib/design/brief-store";
import { loadDesignPeople } from "@/lib/design/people";
import { loadPendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionDirection.brief.title} · ${fr.app.name}`,
};

/**
 * The Brief créatif global (ticket « Conception » § 8, MKT-C2-12): what
 * the dossier lacks before a version is made, the version shown as a
 * document (status, author, changes, PDF), the list of versions, the live
 * preview when the project has moved since, and the dossier's validation.
 */
export default async function DesignBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/design/brief">) {
  const { projectId } = await params;
  const query = await searchParams;
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
  const live = await liveCreativeBrief(projectId, access);
  if (!live) notFound();
  const { data } = live;
  if (!data.started) redirect(routes.projectDesign(projectId));
  const people = await loadDesignPeople(projectId, data.organizationId, access);
  const [briefs, pendingValidation] = await Promise.all([
    loadCreativeBriefs(projectId),
    data.stage ? loadPendingValidation(data.stage.id, people.members) : null,
  ]);

  const t = fr.conceptionDirection.brief;
  const latest = briefs[0] ?? null;
  const asked = Number(query.v);
  const shown =
    query.live === "1"
      ? null
      : (briefs.find((b) => b.number === asked) ?? latest);
  const changed = latest !== null && !sameBrief(latest.content, live.content);
  const inProgress = data.stage?.state === "in_progress";
  const canCreate =
    inProgress &&
    (data.isOwner ||
      people.direction.responsible?.personId === access.personId);
  const nameOf = new Map(people.members.map((m) => [m.personId, m.name]));
  const liveHref = `${routes.projectDesignBrief(projectId)}?live=1`;
  const parts = (before: typeof live.content, after: typeof live.content) =>
    briefChanges(before, after).join(", ");
  const previous = shown && briefs.find((b) => b.number === shown.number - 1);
  const changes = !shown
    ? null
    : shown.id === latest?.id && changed
      ? t.document.changesLive(shown.number, parts(shown.content, live.content))
      : previous && parts(previous.content, shown.content)
        ? t.document.changesSince(
            previous.number,
            parts(previous.content, shown.content),
          )
        : null;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-3">
        <h2 className="text-display-sm font-semibold">{t.title}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {canCreate ? t.intro : t.readOnly}
        </p>
      </header>

      {canCreate && (!latest || changed) && (
        <div className="flex flex-col items-start gap-4">
          <BriefChecksList checks={live.checks} />
          <CreateBriefButton projectId={projectId} first={!latest} />
        </div>
      )}

      {briefs.length > 0 && (
        <nav aria-label={t.versions} className="flex flex-wrap gap-2">
          {briefs.map((b) => (
            <FilterChipLink
              key={b.id}
              href={routes.projectDesignBrief(projectId, b.number)}
              current={shown?.id === b.id}
            >
              {t.version(b.number)}
            </FilterChipLink>
          ))}
          {changed && (
            <FilterChipLink href={liveHref} current={!shown}>
              {t.live}
            </FilterChipLink>
          )}
        </nav>
      )}

      {shown && latest ? (
        <BriefDocumentCard
          projectId={projectId}
          projectTitle={project.title}
          number={shown.number}
          meta={t.document.meta(
            shown.createdBy ? (nameOf.get(shown.createdBy) ?? "") : "",
            formatDateTime(shown.createdAt),
          )}
          status={briefStatus({
            number: shown.number,
            latest: latest.number,
            changed,
            stageState: data.stage?.state ?? null,
          })}
          changes={changes}
        />
      ) : (
        <ToneCallout tone="info">
          {latest ? t.changed(latest.number) : t.noVersion}
        </ToneCallout>
      )}

      <CreativeBriefView
        content={shown ? shown.content : live.content}
        callLinks={Object.fromEntries(
          data.sources.flatMap((s) =>
            s.kind === "call" && s.callId
              ? [[s.title, routes.projectCall(projectId, s.callId)]]
              : [],
          ),
        )}
      />

      {data.stage && (
        <section
          aria-label={t.document.validationTitle}
          className={sectionCardClass}
        >
          <p className="mb-3 text-caption text-muted-foreground">
            {t.document.validationHint}
          </p>
          <ValidationPanel
            stage={data.stage}
            pendingValidation={pendingValidation}
            projectId={projectId}
            mePersonId={access.personId}
            title={t.document.validationTitle}
            startLabel={fr.design.validation.start}
            requestBlocked={briefRequestBlock(
              latest?.number ?? null,
              changed,
              t.document,
            )}
          />
        </section>
      )}
    </div>
  );
}
