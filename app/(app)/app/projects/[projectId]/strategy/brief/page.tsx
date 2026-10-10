import Link from "next/link";
import { IconPenWriting2 } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import {
  GenerateBriefButton,
  ReviseStrategyButton,
} from "@/components/strategy/documents/brief-owner-actions";
import { DocumentActions } from "@/components/strategy/documents/document-actions";
import { DocumentHistory } from "@/components/strategy/documents/document-history";
import { ReviewPanel } from "@/components/strategy/documents/review-panel";
import { SendForValidation } from "@/components/strategy/documents/send-for-validation";
import { StrategyBriefDocument } from "@/components/strategy/documents/strategy-brief-document";
import { StrategyTabs } from "@/components/strategy/strategy-tabs";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  buildStrategySnapshot,
  strategySnapshotMatches,
  strategySnapshotOf,
} from "@/lib/strategy/brief-snapshot";
import { documentFileName } from "@/lib/strategy/documents/names";
import { loadStrategyPage } from "@/lib/strategy/page-data";
import { snapshotProject } from "@/lib/strategy/project";
import { versionsOf } from "@/lib/strategy/workspace";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * The Brief de sortie (ticket § 8 and § 9): its latest version as it was
 * generated, what remains to arbitrate, the validation by several people
 * (who, their state, comments, « Relancer », history), and once approved
 * the frozen V1 with « Réviser la stratégie ». The internal reference.
 */
export default async function StrategyBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/strategy/brief">) {
  const { projectId } = await params;
  const page = await loadStrategyPage(projectId);
  const { access, project, data, ctx, assessment, stage, canEdit, canWrite } =
    page;
  const t = fr.strategyDocs;
  const versions = versionsOf(ctx.documents, "brief");
  const latest = versions[0] ?? null;
  const stored = latest ? strategySnapshotOf(latest.content) : null;
  const live = buildStrategySnapshot(
    data,
    assessment,
    snapshotProject(project, data.referenceDate),
  );
  const director = data.validators[0]?.name ?? null;
  // « Modifier avec PO »: back to the pilot, on what remains to settle,
  // where PO dictates and proposes (Dicter, Proposer des réponses).
  const firstOpen = assessment.dimensions.find((d) => d.state !== "done");
  const editHref = firstOpen
    ? routes.projectStrategyDimension(projectId, firstOpen.dimension)
    : routes.projectStrategy(projectId);

  const header = (
    <div className="flex flex-col gap-6 pt-6">
      <StrategyTabs projectId={projectId} />
    </div>
  );

  if (!latest || !stored)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={IconPenWriting2}
          title={t.brief.emptyTitle}
          body={assessment.ready ? t.brief.emptyBody : t.brief.notReady}
          action={
            canWrite && assessment.ready ? (
              <GenerateBriefButton projectId={projectId} update={false} />
            ) : (
              <Link
                href={routes.projectStrategy(projectId)}
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                {t.brief.toPilot}
              </Link>
            )
          }
        />
      </div>
    );

  const outdated =
    (latest.state === "pending" || latest.state === "changes_requested") &&
    !strategySnapshotMatches(stored, live);
  const approved = versions.find((v) => v.state === "approved") ?? null;
  const owner = canEdit;
  const ownerMoves = owner && canWrite;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {latest.state === "approved" && (
        <ToneCallout tone="success">
          {t.brief.frozen(t.version(latest.version))}
        </ToneCallout>
      )}
      {ctx.revisionOpen && latest.state !== "sent" && (
        <ToneCallout tone="neutral">{t.brief.revisionOpen}</ToneCallout>
      )}
      {latest.state === "changes_requested" && latest.changeComment && (
        <ToneCallout tone="danger">{latest.changeComment}</ToneCallout>
      )}
      {latest.state === "sent" && (
        <ToneCallout tone="neutral">
          {t.validation.noFinalDuringWait}
        </ToneCallout>
      )}
      {outdated && <ToneCallout tone="warning">{t.brief.outdated}</ToneCallout>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {ownerMoves && (
          <Link
            href={editHref}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            {t.brief.editWithPo}
          </Link>
        )}
        {ownerMoves &&
          (outdated ||
            latest.state === "changes_requested" ||
            latest.state === "approved") && (
            <GenerateBriefButton
              projectId={projectId}
              update
              disabled={!assessment.ready}
              variant={latest.state === "approved" ? "outline" : "default"}
            />
          )}
        {ownerMoves && latest.state === "pending" && (
          <SendForValidation
            projectId={projectId}
            documentId={latest.id}
            directorName={director}
            creatives={ctx.creatives}
            disabled={outdated}
          />
        )}
        {owner &&
          stage === "validated" &&
          !ctx.revisionOpen &&
          latest.state === "approved" && (
            <ReviseStrategyButton projectId={projectId} />
          )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <StrategyBriefDocument
          snapshot={stored}
          eyebrow={
            <>
              <span>{t.kinds.brief}</span>
              <span aria-hidden>·</span>
              <span>{t.version(latest.version)}</span>
              <StatusBadge
                tone={strategyDocumentTone[latest.state] ?? "neutral"}
                size="sm"
              >
                {(t.states as Record<string, string>)[latest.state] ??
                  latest.state}
              </StatusBadge>
              {approved && approved.id !== latest.id && (
                <span>
                  · {t.states.approved} : {t.version(approved.version)}
                </span>
              )}
            </>
          }
        />
        <aside className="flex flex-col gap-8 self-start lg:sticky lg:top-6">
          <DocumentActions
            projectId={projectId}
            documentId={latest.id}
            external={false}
            canShare
            pdfHref={routes.strategyDocumentPdf(projectId, latest.id)}
            fileName={documentFileName("brief", project.title, latest.version)}
          />
          <ReviewPanel
            projectId={projectId}
            documentId={latest.id}
            reviews={latest.reviews}
            planned={latest.state === "pending" && director ? [director] : []}
            meId={access.personId}
            canRemind={owner}
          />
          <DocumentHistory
            versions={versions}
            hrefOf={(v) =>
              routes.projectStrategyDocument(projectId, "brief", v.id)
            }
            currentId={latest.id}
          />
        </aside>
      </div>
    </div>
  );
}
