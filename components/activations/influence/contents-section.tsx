import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { VersionCard } from "@/components/ui/version-card";
import type { ActivationFile } from "@/lib/activations/files/queries";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import type { ActivationScope } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { formatDateTime } from "@/lib/release/format";

import {
  AddContentButton,
  ContentDecisionButtons,
  FeedbackStatusSelect,
} from "./content-buttons";

const fr = { activationInfluence };

const t = fr.activationInfluence.contents;
const decisionTone = {
  approved: "success",
  changes_requested: "warning",
  refused: "danger",
} as const;

/** Every version (none is ever replaced), its decision and its feedback,
 * newest first. */
export function ContentsSection({
  scope,
  targetId,
  contents,
  feedback,
  files,
  members,
  canWrite,
  canValidate,
}: {
  scope: ActivationScope;
  targetId: string;
  contents: InfluenceData["contents"];
  feedback: InfluenceData["feedback"];
  files: Map<string, ActivationFile>;
  members: Member[];
  canWrite: boolean;
  canValidate: boolean;
}) {
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  const ordered = [...contents].reverse();
  return (
    <ActivationSection
      id="contents"
      title={t.title}
      description={t.description}
      action={
        canWrite && (
          <AddContentButton
            scope={scope}
            targetId={targetId}
            nextLabel={`V${contents.length + 1}`}
          />
        )
      }
    >
      {ordered.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((c, i) => {
            const file = c.file_id ? files.get(c.file_id) : undefined;
            const notes = feedback.filter((f) => f.content_id === c.id);
            return (
              <VersionCard
                key={c.id}
                title={c.label}
                status={{
                  tone: c.decision
                    ? decisionTone[c.decision as keyof typeof decisionTone]
                    : "action",
                  label: c.decision
                    ? t.decisions[c.decision as keyof typeof t.decisions]
                    : t.undecided,
                }}
                meta={t.by(nameOf(c.created_by), formatDateTime(c.created_at))}
                defaultOpen={i === 0}
              >
                {(c.url || file?.href) && (
                  <p className="flex flex-wrap gap-x-4 text-body-sm">
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline underline-offset-4"
                      >
                        {c.url}
                      </a>
                    )}
                    {file?.href && (
                      <a
                        href={file.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {file.fileName}
                      </a>
                    )}
                  </p>
                )}
                {c.note && <p className="text-body-sm break-words">{c.note}</p>}
                {c.decision_comment && (
                  <p className="text-body-sm text-[color:var(--text-secondary)]">
                    {t.comment} : {c.decision_comment}
                  </p>
                )}
                {notes.length > 0 && (
                  <ul className="flex flex-col gap-2 border-l-2 border-[color:var(--border-hairline)] pl-3">
                    {notes.map((f) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-start justify-between gap-2 text-body-sm"
                      >
                        <span className="min-w-0 break-words">
                          {f.timecode && (
                            <span className="font-semibold tabular-nums">
                              {f.timecode} ·{" "}
                            </span>
                          )}
                          <span className="text-[color:var(--text-secondary)]">
                            {
                              t.categories[
                                f.category as keyof typeof t.categories
                              ]
                            }{" "}
                            ·{" "}
                          </span>
                          {f.comment}
                        </span>
                        {canWrite || canValidate ? (
                          <FeedbackStatusSelect
                            projectId={scope.projectId}
                            feedbackId={f.id}
                            status={f.status}
                          />
                        ) : (
                          <span className="text-caption text-[color:var(--text-secondary)]">
                            {
                              t.feedbackStatuses[
                                f.status as keyof typeof t.feedbackStatuses
                              ]
                            }
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {(canWrite || canValidate) && (
                  <ContentDecisionButtons
                    projectId={scope.projectId}
                    contentId={c.id}
                    decided={Boolean(c.decision)}
                    canDecide
                    canComment
                  />
                )}
              </VersionCard>
            );
          })}
        </div>
      )}
    </ActivationSection>
  );
}
