import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconPenWriting2 } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { VersionView } from "@/components/strategy/documents/version-view";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadStrategyPage } from "@/lib/strategy/page-data";
import {
  DOCUMENT_KINDS,
  versionsOf,
  type DocumentKind,
} from "@/lib/strategy/workspace";

const isKind = (value: string): value is DocumentKind =>
  (DOCUMENT_KINDS as readonly string[]).includes(value);

/**
 * One document and its versions (ticket § 13, « Versions »): the version in
 * the URL (?v=), else the approved one, else the latest. Read by whoever
 * sees the project; the owner shares, sends and reminds from here too.
 */
export default async function StrategyDocumentPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/documents/[kind]">) {
  const { projectId, kind } = await params;
  const { v } = await searchParams;
  const { access, project, data, ctx, canEdit } =
    await loadStrategyPage(projectId);
  // A notification names the version only: open it under its own kind.
  if (kind === "version") {
    const doc = ctx.documents.find((d) => d.id === v);
    if (!doc) notFound();
    redirect(routes.projectStrategyDocument(projectId, doc.kind, doc.id));
  }
  if (!isKind(kind)) notFound();
  const t = fr.strategyDocs;
  const versions = versionsOf(ctx.documents, kind);
  const version =
    versions.find((x) => x.id === v) ??
    versions.find((x) => x.state === "approved") ??
    versions[0];

  return (
    <div className="flex flex-col gap-6 pt-6">
      <StrategyTabs projectId={projectId} />
      <h2 className="text-display-sm font-semibold">
        {t.versionsTitle(t.kinds[kind])}
      </h2>
      {version ? (
        <VersionView
          projectId={projectId}
          projectTitle={project.title}
          version={version}
          versions={versions}
          meId={access.personId}
          owner={canEdit}
          director={data.validators[0]?.name ?? null}
          creatives={ctx.creatives}
          editHref={
            kind === "brief"
              ? routes.projectStrategyBrief(projectId)
              : kind === "release_plan"
                ? routes.projectStrategyReleasePlan(projectId, 6)
                : routes.projectStrategyPressKit(projectId, 3)
          }
        />
      ) : (
        <EmptyState
          icon={IconPenWriting2}
          title={t.states.toGenerate}
          body={t.audiences[kind]}
          action={
            <Link
              href={routes.projectStrategyDocuments(projectId)}
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              {fr.strategyFlow.tabs.documents}
            </Link>
          }
        />
      )}
    </div>
  );
}
