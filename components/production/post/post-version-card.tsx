import { IconFile, IconLink } from "nucleo-sharp-essential";

import { DeliverableVersion } from "@/components/ui/deliverable-version";
import { productionCut } from "@/lib/i18n/fr/production-cut";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { versionName } from "@/lib/production/post/labels";
import { versionActions, type PostRole } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostVersion,
  ProviderLinkState,
} from "@/lib/production/post/types";
import { formatDateTime } from "@/lib/release/format";
import { productionVersionTone, type Tone } from "@/lib/ui/state-tones";

import { CommentAddButton } from "./comment-add-button";
import { CommentList } from "./comment-list";
import { CorrectionAnswers } from "./correction-answers";
import { CorrectionRequestBlock } from "./correction-request";
import { CorrectionsBlock } from "./corrections-block";
import { VersionControls } from "./version-controls";

const fr = { productionPost, productionCut };

const t = fr.productionPost;

/**
 * One version in the Fiche Livrable: status, the version it follows, author
 * (the provider, kept when another takes over), who deposited and submitted
 * it, the file or link, the notes and the decision; what the previous
 * version had to correct (PROD-032); its feedback by timecode; its
 * correction request (PROD-031), else the corrections still open.
 */
export function PostVersionCard({
  scope,
  people,
  version: v,
  previous,
  role,
  links,
}: {
  scope: PostScope;
  people: PostPeople;
  version: PostVersion;
  // The version it follows, when loaded.
  previous: PostVersion | null;
  role: PostRole;
  links: Record<string, ProviderLinkState>;
}) {
  const name = versionName(v);
  const can = versionActions(v.status, role);
  const decided =
    v.decidedBy &&
    v.decidedAt &&
    (v.status === "changes_requested" ||
      v.status === "approved" ||
      v.status === "refused")
      ? t.versions.decided[v.status](v.decidedBy, formatDateTime(v.decidedAt))
      : null;
  const media = v.file?.href
    ? { href: v.file.href, label: v.file.fileName, icon: IconFile }
    : v.url
      ? { href: v.url, label: t.versions.openLink, icon: IconLink }
      : null;

  const statuses = [
    {
      tone: productionVersionTone[v.status],
      label: t.versions.statuses[v.status],
    },
    ...(v.ext !== "none"
      ? [
          {
            tone: (v.ext === "approved"
              ? "success"
              : v.ext === "changes"
                ? "warning"
                : "info") as Tone,
            label: fr.productionCut.side.ext(
              fr.productionCut.side.states[v.ext],
            ),
          },
        ]
      : []),
  ];

  return (
    <DeliverableVersion
      name={name}
      statuses={statuses}
      controls={
        <VersionControls scope={scope} people={people} version={v} can={can} />
      }
      line={
        <>
          {v.previousNumber !== null &&
            `${t.versions.follows(v.previousNumber)} · `}
          {t.versions.authorLine(v.author?.name ?? t.versions.authorNone)}
          {" · "}
          {t.versions.createdBy(v.createdBy, formatDateTime(v.createdAt))}
          {v.submittedBy &&
            v.submittedAt &&
            ` · ${t.versions.submittedOn(v.submittedBy, formatDateTime(v.submittedAt))}`}
        </>
      }
    >
      {media ? (
        <a
          href={media.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 break-all underline underline-offset-4"
        >
          <media.icon aria-hidden className="size-4 shrink-0" />
          {media.label}
        </a>
      ) : (
        v.status === "draft" && (
          <p className="text-sm text-muted-foreground">{t.versions.noMedia}</p>
        )
      )}
      {v.notes && <p className="break-words whitespace-pre-line">{v.notes}</p>}
      {decided && (
        <p className="text-sm">
          <span className="text-muted-foreground">{decided}</span>
          {v.decisionNote && (
            <span className="block break-words whitespace-pre-line">
              {v.decisionNote}
            </span>
          )}
        </p>
      )}

      {previous && (
        <CorrectionAnswers
          projectId={scope.projectId}
          previous={previous}
          canReview={role.canReview}
        />
      )}

      {v.status !== "draft" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{t.comments.title}</h4>
            {can.comment && (
              <CommentAddButton
                scope={scope}
                versionId={v.id}
                name={name}
                canAttach={role.canOrganize}
              />
            )}
          </div>
          <CommentList
            projectId={scope.projectId}
            comments={v.comments}
            canReview={role.canReview}
          />
        </div>
      )}
      {v.request ? (
        <CorrectionRequestBlock
          projectId={scope.projectId}
          version={v}
          request={v.request}
          people={people}
          canReview={role.canReview}
          sheetId={scope.sheetId}
          canOrganize={role.canOrganize}
          link={
            v.request.recipient.kind === "contact"
              ? (links[v.request.recipient.id] ?? null)
              : null
          }
        />
      ) : (
        v.status !== "draft" && <CorrectionsBlock version={v} />
      )}
    </DeliverableVersion>
  );
}
