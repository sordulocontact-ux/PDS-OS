import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MessageRecord } from "@/lib/activations/messages/queries";
import type { MessageKind } from "@/lib/activations/model";
import { emailEnabled } from "@/lib/email/send";
import type { Member } from "@/lib/framing/related";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { formatDate } from "@/lib/release/format";
import { activationMessageTone } from "@/lib/ui/state-tones";

import { MessageActions } from "./message-actions";
import type { MessageDefaults } from "./message-form";
import { NewMessageButton } from "./new-message-button";

const fr = { activationWork };

const t = fr.activationWork.messages;

/**
 * The messages of a collaboration, a press target or an agency : each with
 * its status — prepared, validated, sent as declared (proven when a proof is
 * given) — never shown as sent without its event.
 */
export function MessagesSection({
  projectId,
  activationId,
  targetId,
  messages,
  kinds,
  defaults,
  pressKitId = null,
  email = null,
  members,
  canWrite,
  today,
  title = t.title,
  addAction,
}: {
  projectId: string;
  activationId: string;
  targetId: string | null;
  messages: MessageRecord[];
  kinds: readonly MessageKind[];
  defaults: MessageDefaults;
  pressKitId?: string | null;
  email?: string | null;
  members: Member[];
  canWrite: boolean;
  today: string;
  title?: string;
  // Replaces « Préparer un message » (a draft written by code, the recap).
  addAction?: React.ReactNode;
}) {
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  return (
    <PageSection
      id="messages"
      title={title}
      description={t.description}
      action={
        canWrite &&
        (addAction ?? (
          <NewMessageButton
            projectId={projectId}
            activationId={activationId}
            targetId={targetId}
            kinds={kinds}
            defaults={defaults}
            pressKitId={pressKitId}
          />
        ))
      }
    >
      {messages.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium break-words">
                    {m.subject ?? t.kinds[m.kind]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t.kinds[m.kind]} · {t.channels[m.channel]}
                    {m.dueOn && ` · ${t.dueOn} ${formatDate(m.dueOn)}`}
                  </span>
                </div>
                <StatusBadge size="sm" tone={activationMessageTone[m.status]}>
                  {m.status === "sent_declared" && m.sentProofUrl
                    ? t.proven
                    : t.statuses[m.status]}
                </StatusBadge>
              </div>
              <details className="text-sm">
                <summary className="w-fit cursor-pointer text-muted-foreground">
                  {t.body}
                </summary>
                <p className="mt-2 break-words whitespace-pre-wrap">{m.body}</p>
              </details>
              {m.reviewComment && m.status === "draft" && (
                <p className="text-sm text-[color:var(--tone-warning-fg)]">
                  {t.reviewComment} : {m.reviewComment}
                </p>
              )}
              {m.derogationReason && (
                <p className="text-sm text-muted-foreground">
                  {t.derogation} : {m.derogationReason}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {[
                  m.validatedAt
                    ? t.validatedBy(
                        nameOf(m.validatedBy),
                        formatDate(m.validatedAt),
                      )
                    : null,
                  m.sentOn
                    ? t.sentBy(nameOf(m.sentDeclaredBy), formatDate(m.sentOn))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {m.sentProofUrl && (
                  <>
                    {" · "}
                    <a
                      href={m.sentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {t.proof}
                    </a>
                  </>
                )}
              </p>
              {canWrite && (
                <MessageActions
                  projectId={projectId}
                  activationId={activationId}
                  message={m}
                  kinds={kinds}
                  defaults={defaults}
                  pressKitId={pressKitId}
                  email={email}
                  canEmail={
                    emailEnabled() &&
                    Boolean(email) &&
                    m.channel === "email" &&
                    !m.pressKitDocumentId &&
                    Boolean(m.targetId)
                  }
                  today={today}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
