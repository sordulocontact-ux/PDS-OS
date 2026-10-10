import { IconChevronLeft } from "nucleo-sharp-essential";
import { notFound, redirect } from "next/navigation";

import { EditAccessProvider } from "@/components/projects/edit-access";
import { BriefSnapshotView } from "@/components/strategy/brief/brief-snapshot-view";
import { BriefValidationAside } from "@/components/strategy/documents/brief-validation-aside";
import { StrategyDictation } from "@/components/strategy/strategy-dictation";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { formatDay } from "@/lib/assistant/facts";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { workflowGate } from "@/lib/plan/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isFramingValidated } from "@/lib/projects/types";
import { briefSnapshotOf } from "@/lib/strategy/documents/brief-snapshot";
import { loadBriefSource } from "@/lib/strategy/documents/brief-source";
import { approvedOf, sentOf, versionsOf } from "@/lib/strategy/documents/model";
import { loadStrategyDocuments } from "@/lib/strategy/documents/queries";
import { allInOrder } from "@/lib/utils/parallel";
import { cn } from "@/lib/utils";

export const metadata = { title: `${fr.strategyBrief.title} · ${fr.app.name}` };

/**
 * The Brief de sortie (ticket Stratégie § 8 and § 9). While the strategy is
 * worked on: the live Brief, « Modifier avec PO », « Demander la
 * validation ». While a version is sent: that version, as the reviewers
 * read it, and who validates. Once validated: « Brief de sortie — V1 »,
 * frozen, with Voir · Partager · PDF and « Réviser la stratégie ». Any
 * stored version opens with ?v=<n>, exactly as it was established.
 */
export default async function StrategyBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/brief">) {
  const { projectId } = await params;
  const asked = Number((await searchParams).v);
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  // Before the strategy is open, its page says why (Cadrage, plan, entry).
  if (!isFramingValidated(project.stages))
    redirect(routes.projectStrategy(projectId));
  if (await workflowGate(project, "strategy"))
    redirect(routes.projectStrategy(projectId));
  const source = await loadBriefSource(projectId, access);
  if (!source) notFound();
  const { data } = source;
  if (!data.started) redirect(routes.projectStrategy(projectId));
  const docs = await loadStrategyDocuments(projectId, data.members);

  const t = fr.strategyBrief;
  const td = fr.strategyDocuments;
  const versions = versionsOf(docs.documents, "brief");
  const sent = sentOf(versions, "brief");
  const approved = approvedOf(versions, "brief");
  const stageState = data.stage?.state ?? "not_started";
  const isOwner = canEditProject(access, project);
  const editable =
    !sent &&
    (stageState === "in_progress" ||
      (stageState === "validated" && docs.revisionOpen));
  // The version on screen: the one asked, the one under review, or the
  // reference once validated; else the live Brief.
  const shown = Number.isInteger(asked)
    ? (versions.find((v) => v.version === asked) ?? null)
    : (sent ?? (editable ? null : approved));
  if (Number.isInteger(asked) && !shown) notFound();
  const snapshot = shown ? briefSnapshotOf(shown.content) : source.snapshot;
  const canWrite = isOwner && editable && !shown;

  const heading = shown
    ? shown.state === "approved"
      ? td.versionView.validatedTitle(shown.version)
      : td.titleVersion(t.title, shown.version)
    : t.title;
  const subline = shown
    ? shown.state === "approved" && shown.decidedAt
      ? td.versionView.frozen(formatDay(shown.decidedAt))
      : td.versionView.snapshotOf(formatDay(shown.createdAt))
    : t.asOf(formatBriefDate(source.snapshot.generatedOn));

  return (
    <div className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <EditAccessProvider canEdit={canWrite}>
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-wrap gap-x-4">
            <ViewLink
              href={routes.projectStrategy(projectId)}
              className="-ml-1 inline-flex min-h-10 w-fit items-center gap-1 rounded-md px-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <IconChevronLeft aria-hidden className="size-4" />
              {t.backToPilotage}
            </ViewLink>
            {shown && editable && (
              <ViewLink
                href={routes.projectStrategyBrief(projectId)}
                className="inline-flex min-h-10 items-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {td.versionView.backToLive}
              </ViewLink>
            )}
          </div>
          <StrategyDictation projectId={projectId} label={t.modifyWithPo}>
            <h2 className="text-display-md font-semibold break-words">
              {heading}
            </h2>
            <p className="text-caption text-muted-foreground">{subline}</p>
            <p className="max-w-prose text-body-md text-muted-foreground">
              {t.body}
            </p>
          </StrategyDictation>

          {!shown && !source.ready ? (
            <section className={cn(sectionCardClass, "flex flex-col gap-2")}>
              <h2 className="text-body-md font-semibold">{t.notReady.title}</h2>
              <p className="text-body-md text-muted-foreground">
                {t.notReady.body}
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {source.missing.map((d) => (
                  <li key={d}>
                    <ViewLink
                      href={routes.projectStrategyDimension(projectId, d)}
                      className="underline underline-offset-2"
                    >
                      {fr.strategyPilot.dimensions[d]}
                    </ViewLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : snapshot ? (
            <BriefSnapshotView
              snapshot={snapshot}
              projectId={shown ? null : projectId}
            />
          ) : (
            <p className="text-body-md text-muted-foreground">
              {td.versionView.notFound}
            </p>
          )}
        </div>
      </EditAccessProvider>

      <aside className="self-start rounded-2xl border border-border bg-background p-5 lg:sticky lg:top-6">
        <BriefValidationAside
          projectId={projectId}
          shown={shown}
          sent={sent}
          approved={approved}
          versions={versions}
          canRequest={isOwner && editable && source.ready}
          notReadyReason={
            isOwner && editable && !source.ready ? td.request.notReady : null
          }
          isOwner={isOwner}
          revisionOpen={docs.revisionOpen}
          meId={access.personId}
          directorName={data.validators[0]?.name ?? null}
          creatives={docs.creatives}
        />
      </aside>
    </div>
  );
}
