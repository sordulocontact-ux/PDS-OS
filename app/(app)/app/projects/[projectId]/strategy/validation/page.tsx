import { notFound } from "next/navigation";

import { BriefSnapshotView } from "@/components/strategy/brief/brief-snapshot-view";
import { StrategyStepFrame } from "@/components/strategy/journey/strategy-step-frame";
import {
  BriefDecision,
  BriefResubmit,
} from "@/components/strategy/validation/brief-decision";
import { BriefOutDoc } from "@/components/strategy/validation/brief-out-doc";
import { RemindReviewer } from "@/components/strategy/validation/remind-reviewer";
import { ReviewRows } from "@/components/strategy/validation/review-rows";
import { SendBrief } from "@/components/strategy/validation/send-brief";
import { ReturnCallout } from "@/components/ui/return-callout";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { briefOutFrom, briefOutOf } from "@/lib/strategy/brief-out";
import { briefSnapshotOf } from "@/lib/strategy/documents/brief-snapshot";
import { versionsOf } from "@/lib/strategy/documents/model";
import { strategyStepData } from "@/lib/strategy/step-data";
import { formatShortInstant } from "@/lib/utils/day";

/**
 * Stratégie › Validation du Brief de sortie (proto BODY_MK.st3, ticket § 8
 * and § 9): the Brief on the piece in four blocks, « Envoyer en
 * validation » (direction always, creative directors ticked), each
 * validator's state with « Relancer », « Votre décision » for a validator,
 * the reason signed and « Répondre et transmettre à nouveau » after a
 * change asked, « Brief de sortie — Vn validé » at the end. `?v=n` shows a
 * stored version.
 */
export default async function StrategyValidationPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/strategy/validation">) {
  const { projectId } = await params;
  const asked = Number((await searchParams).v);
  const ctx = await strategyStepData(projectId);
  if (!ctx) notFound();
  const { docs, latest, approved, isOwner, access, model, data, validators } =
    ctx;
  const t = fr.strategyBriefOut;
  const step = ctx.steps.find((s) => s.key === "validation");
  const briefs = versionsOf(docs.documents, "brief");
  const shown =
    briefs.find((d) => d.version === asked) ??
    (latest && latest.state !== "changes_requested" ? latest : null);
  const stored = shown ? briefOutOf(shown.content) : null;
  const old = shown && !stored ? briefSnapshotOf(shown.content) : null;
  const live = briefOutFrom(model, data.referenceDate);
  const version = shown?.version ?? (latest?.version ?? 0) + 1;
  const returned = latest?.state === "changes_requested" ? latest : null;
  const changer = returned?.reviews.find(
    (r) => r.state === "changes_requested",
  );
  const sent = latest?.state === "sent" ? latest : null;
  const myReview = sent?.reviews.find(
    (r) => r.personId === access.personId && r.state === "pending",
  );
  const director = validators.find((v) => v.role === "direction") ?? null;
  const creatives = validators.filter((v) => v.role === "creative");
  const validatedHere =
    approved && step?.status === "done" && (!shown || shown.id === approved.id);

  return (
    <StrategyStepFrame
      projectId={projectId}
      stepKey="validation"
      returned={
        returned && changer?.comment ? (
          <ReturnCallout
            by={changer.name}
            outcome={t.decision.outcome}
            note={changer.comment}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {validatedHere && approved && (
          <ToneCallout tone="success" as="div">
            <span>
              <strong className="font-semibold">
                {t.validatedTitle(approved.version)}
              </strong>{" "}
              {t.validated(
                approved.version,
                formatShortInstant(approved.decidedAt ?? approved.createdAt),
              )}
            </span>
          </ToneCallout>
        )}
        {old && shown ? (
          <BriefSnapshotView snapshot={old} projectId={projectId} />
        ) : (
          <BriefOutDoc
            version={version}
            out={stored ?? live}
            pdfHref={
              shown
                ? routes.projectStrategyDocumentPdf(projectId, shown.id)
                : null
            }
          />
        )}
        {(sent ?? returned ?? (validatedHere ? approved : null)) && (
          <ReviewRows reviews={(sent ?? returned ?? approved)?.reviews ?? []} />
        )}
        {myReview && sent && (
          <BriefDecision projectId={projectId} documentId={sent.id} />
        )}
        {sent && isOwner && !myReview && (
          <div className="flex flex-wrap gap-2">
            {sent.reviews
              .filter((r) => r.state === "pending")
              .map((r) => (
                <RemindReviewer
                  key={r.id}
                  projectId={projectId}
                  reviewId={r.id}
                  name={r.name}
                />
              ))}
          </div>
        )}
        {returned && isOwner && (
          <BriefResubmit
            projectId={projectId}
            creativeIds={creatives.map((c) => c.personId)}
          />
        )}
        {!sent && !returned && step?.status === "current" && isOwner && (
          <SendBrief
            projectId={projectId}
            director={director}
            creatives={creatives}
          />
        )}
        {!isOwner && !myReview && step?.status === "current" && (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.waitingOwner(
              ctx.project.ownerName ?? "—",
              (step.actor?.todo ?? "").toLowerCase(),
            )}
          </p>
        )}
        {sent && !myReview && !isOwner && (
          <p className="text-caption text-[color:var(--text-tertiary)]">
            {t.waiting(
              fr.strategyJourney.names(
                sent.reviews
                  .filter((r) => r.state === "pending")
                  .map((r) => r.name),
              ),
            )}
          </p>
        )}
      </div>
    </StrategyStepFrame>
  );
}
