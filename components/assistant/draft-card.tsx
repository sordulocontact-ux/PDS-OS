"use client";

import Link from "next/link";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { FeedbackDraftActions } from "@/components/assistant/feedback-draft-actions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DraftProposal } from "@/lib/assistant/drafts";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

/**
 * A PO draft in the conversation: what it would write (written by code, the
 * previous value struck through), what PO could not fill, and the button that
 * opens the real form. Nothing is saved before that form is. A feedback is
 * the exception: sent from the card as shown, or edited in the feedback
 * window (FeedbackDraftActions).
 */
export function DraftCard({
  toolCallId,
  proposal,
}: {
  toolCallId: string;
  proposal: DraftProposal;
}) {
  const t = fr.assistant.drafts;
  const { saved, review } = useAssistant();
  const link = saved[toolCallId];
  const { draft } = proposal;
  // A feedback is short and sent as shown: its whole text is on the card.
  const isFeedback = draft.kind === "feedback";

  return (
    <section
      aria-label={proposal.title}
      className="grid gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{proposal.title}</p>
        <StatusBadge
          tone={reviewTone[link ? "confirmed" : "proposed"]}
          size="sm"
        >
          {link ? (isFeedback ? t.feedback.sent : t.saved) : t.badge}
        </StatusBadge>
      </div>

      {link && !isFeedback ? (
        // Once saved, the form's values are the truth, not PO's proposal
        // (UX test of 09/10/2026: « est-ce ma correction ou la sienne ? »).
        <>
          <p className="text-xs text-muted-foreground">{t.savedAsReviewed}</p>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              {t.proposal}
            </summary>
            <div className="grid gap-3 pt-2 opacity-70">
              <DraftBody proposal={proposal} isFeedback={false} />
            </div>
          </details>
        </>
      ) : (
        <DraftBody proposal={proposal} isFeedback={isFeedback} />
      )}

      {link ? (
        <Link
          href={link.href}
          className="w-fit text-sm font-medium underline underline-offset-4"
        >
          {t.open} : {link.label}
        </Link>
      ) : isFeedback ? (
        <FeedbackDraftActions toolCallId={toolCallId} draft={draft} />
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button size="sm" onClick={() => review(toolCallId, proposal)}>
            {t.review}
          </Button>
          <span className="text-caption text-muted-foreground">
            {t.notSaved}
          </span>
        </div>
      )}
    </section>
  );
}

// What PO proposes: the changes (previous value struck through), or nothing,
// then what it could not fill.
function DraftBody({
  proposal,
  isFeedback,
}: {
  proposal: DraftProposal;
  isFeedback: boolean;
}) {
  const t = fr.assistant.drafts;
  return (
    <>
      {proposal.changes.length > 0 ? (
        <dl className="grid gap-2 text-xs">
          {proposal.changes.map((c) => (
            <div key={c.label} className="grid gap-0.5">
              <dt className="text-muted-foreground">{c.label}</dt>
              <dd
                className={cn(
                  "whitespace-pre-wrap",
                  !isFeedback && "line-clamp-3",
                )}
              >
                {c.before && (
                  <>
                    <del className="text-muted-foreground">{c.before}</del>{" "}
                  </>
                )}
                {c.after}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">{t.empty}</p>
      )}

      {proposal.warnings.length > 0 && (
        <ul className="grid list-disc gap-1 pl-4 text-xs text-[color:var(--tone-warning-fg)]">
          {proposal.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </>
  );
}
