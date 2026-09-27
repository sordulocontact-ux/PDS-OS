"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { useOpenFeedback } from "@/components/feedback/feedback-provider";
import { Button } from "@/components/ui/button";
import type { FeedbackDraft } from "@/lib/assistant/drafts";
import { routes } from "@/lib/auth/redirects";
import { sendFeedback } from "@/lib/feedback/actions";
import { fr } from "@/lib/i18n/fr";

const feedbackPage = { label: fr.feedback.title, href: routes.feedback };

// A feedback prepared by PO, from its card: "Envoyer" sends the text shown
// on the card as it is (the click is the person's decision, with their
// session); "Modifier" opens the feedback window over the page, pre-filled,
// to change it or add a screenshot before sending.
export function FeedbackDraftActions({
  toolCallId,
  draft,
}: {
  toolCallId: string;
  draft: FeedbackDraft;
}) {
  const t = fr.assistant.drafts.feedback;
  const { markSaved, setLauncherOpen } = useAssistant();
  const openFeedback = useOpenFeedback();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      setFailed(false);
      const result = await sendFeedback({
        kind: draft.values.feedbackKind,
        message: draft.values.message,
        pagePath: draft.values.pagePath,
        screenshotPath: null,
      });
      if (!result.ok) {
        setFailed(true);
        return;
      }
      toast.success(fr.feedback.success);
      markSaved(toolCallId, feedbackPage);
    });

  const edit = () => {
    // Never two layers: the Espace Espace window gives way.
    setLauncherOpen(false);
    openFeedback({
      defaults: {
        kind: draft.values.feedbackKind,
        message: draft.values.message,
      },
      pagePath: draft.values.pagePath,
      onSent: () => markSaved(toolCallId, feedbackPage),
    });
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={send}
        >
          {pending ? t.sending : t.send}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={edit}>
          {t.edit}
        </Button>
      </div>
      <p
        role={failed ? "alert" : undefined}
        className={
          failed
            ? "text-caption text-[color:var(--tone-danger-fg)]"
            : "text-caption text-muted-foreground"
        }
      >
        {failed ? t.failed : t.hint}
      </p>
    </div>
  );
}
