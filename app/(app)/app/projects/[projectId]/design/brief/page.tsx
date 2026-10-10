import { notFound, redirect } from "next/navigation";

import { CreateBriefButton } from "@/components/design/brief/create-brief-button";
import { CreativeBriefView } from "@/components/design/brief/creative-brief-view";
import { ConceptionTabs } from "@/components/design/conception-tabs";
import { DesignNeedsStrategy } from "@/components/design/design-needs-strategy";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime } from "@/lib/calls/format";
import { buildCreativeBrief } from "@/lib/design/brief";
import { loadCreativeBriefs, sameBrief } from "@/lib/design/brief-store";
import { loadConception } from "@/lib/design/conception";
import { loadDirection } from "@/lib/design/direction";
import { loadDesignPeople } from "@/lib/design/people";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isStageValidated } from "@/lib/projects/types";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.conceptionDirection.brief.title} · ${fr.app.name}`,
};

/**
 * The Brief créatif global (ticket « Conception » § 8): the latest stored
 * version (or ?v=n), the list of versions, and the live preview of what a
 * new version would hold when the project has moved since.
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
  const data = await loadConception(project, access);
  if (!data) notFound();
  if (!data.started) redirect(routes.projectDesign(projectId));
  const people = await loadDesignPeople(projectId, data.organizationId, access);
  const [direction, briefs] = await Promise.all([
    loadDirection(projectId, people.members),
    loadCreativeBriefs(projectId),
  ]);
  const live = await buildCreativeBrief(project, data, direction);

  const t = fr.conceptionDirection.brief;
  const latest = briefs[0] ?? null;
  const asked = Number(query.v);
  const shown =
    query.live === "1"
      ? null
      : (briefs.find((b) => b.number === asked) ?? latest);
  const changed = latest !== null && !sameBrief(latest.content, live);
  const inProgress = data.stage?.state === "in_progress";
  const canCreate =
    inProgress &&
    (data.isOwner ||
      people.direction.responsible?.personId === access.personId);
  const nameOf = new Map(people.members.map((m) => [m.personId, m.name]));
  const liveHref = `${routes.projectDesignBrief(projectId)}?live=1`;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <ConceptionTabs projectId={projectId} />
      <header className="flex flex-col gap-3">
        <h2 className="text-display-sm font-semibold">
          {shown ? `${t.title} · ${t.version(shown.number)}` : t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {canCreate ? t.intro : t.readOnly}
        </p>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <CreateBriefButton projectId={projectId} first={!latest} />
          </div>
        )}
      </header>

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

      {shown && (
        <p className="-mt-4 text-caption text-muted-foreground">
          {t.versionOf(
            shown.number,
            shown.createdBy ? (nameOf.get(shown.createdBy) ?? "") : "",
            formatDateTime(shown.createdAt),
          )}
        </p>
      )}

      {!latest ? (
        <ToneCallout tone="info">{t.noVersion}</ToneCallout>
      ) : !shown ? (
        <ToneCallout tone="info">{t.changed(latest.number)}</ToneCallout>
      ) : shown.id === latest.id ? (
        <ToneCallout tone={changed ? "warning" : "success"}>
          {changed ? t.changed(latest.number) : t.upToDate(latest.number)}
        </ToneCallout>
      ) : null}

      <CreativeBriefView content={shown ? shown.content : live} />
    </div>
  );
}
