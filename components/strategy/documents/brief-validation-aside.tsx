import { DocumentActions } from "@/components/strategy/documents/document-actions";
import { DocumentHistory } from "@/components/strategy/documents/document-history";
import { ReviewPanel } from "@/components/strategy/documents/review-panel";
import { RevisionButton } from "@/components/strategy/documents/revision-button";
import { SendForValidation } from "@/components/strategy/documents/send-for-validation";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { CreativeMember } from "@/lib/projects/creatives";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

/**
 * The Brief de sortie's validation, beside the document (ticket § 9): the
 * request (owner, once the Brief is established), who validates and where
 * each stands while a version is sent, the reference version and its
 * actions once validated, « Réviser la stratégie », and the history.
 */
export function BriefValidationAside({
  projectId,
  shown,
  sent,
  approved,
  versions,
  canRequest,
  notReadyReason,
  isOwner,
  revisionOpen,
  meId,
  directorName,
  creatives,
}: {
  projectId: string;
  // The version on screen (null: the live Brief).
  shown: StrategyDocument | null;
  sent: StrategyDocument | null;
  approved: StrategyDocument | null;
  versions: StrategyDocument[];
  canRequest: boolean;
  notReadyReason: string | null;
  isOwner: boolean;
  revisionOpen: boolean;
  meId: string | null;
  directorName: string | null;
  creatives: CreativeMember[];
}) {
  const t = fr.strategyDocuments;
  const corrected = versions.find((v) => v.state === "changes_requested");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-body-md font-semibold">{t.review.title}</h2>
          {shown && (
            <StatusBadge tone={strategyDocumentTone[shown.state]} size="sm">
              {t.states[shown.state]}
            </StatusBadge>
          )}
        </div>

        {sent ? (
          <>
            <ToneCallout tone="warning">{t.review.waiting}</ToneCallout>
            <ReviewPanel
              projectId={projectId}
              documentId={sent.id}
              reviews={sent.reviews}
              requestNote={sent.requestNote}
              meId={meId}
              canRemind={isOwner}
            />
          </>
        ) : canRequest ? (
          <>
            {corrected?.changeComment && !revisionOpen && (
              <ToneCallout tone="danger">
                {t.review.changeRequested(corrected.changeComment)}
              </ToneCallout>
            )}
            <SendForValidation
              projectId={projectId}
              target={{ brief: true }}
              directorName={directorName}
              creatives={creatives}
            />
          </>
        ) : (
          notReadyReason && (
            <p className="text-sm text-muted-foreground">{notReadyReason}</p>
          )
        )}

        {approved && (
          <div className="flex flex-col gap-2">
            {revisionOpen && (
              <ToneCallout tone="info">
                {t.revision.running(approved.version)}
              </ToneCallout>
            )}
            <p className="text-body-md font-semibold">
              {t.versionView.validatedTitle(approved.version)}
            </p>
            <DocumentActions
              viewHref={routes.projectStrategyBriefVersion(
                projectId,
                approved.version,
              )}
              shareHref={routes.projectStrategyBriefVersion(
                projectId,
                approved.version,
              )}
              pdfHref={routes.projectStrategyDocumentPdf(
                projectId,
                approved.id,
              )}
            />
            <p className="text-caption text-muted-foreground">
              {t.actions.internal}
            </p>
            {isOwner && !revisionOpen && !sent && (
              <div>
                <RevisionButton projectId={projectId} />
              </div>
            )}
          </div>
        )}
      </div>

      <div id="versions">
        <DocumentHistory
          versions={versions}
          currentId={shown?.id}
          hrefOf={(v) =>
            routes.projectStrategyBriefVersion(projectId, v.version)
          }
        />
      </div>
    </div>
  );
}
