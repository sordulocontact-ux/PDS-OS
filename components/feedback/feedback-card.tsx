import { StatusBadge } from "@/components/ui/status-badge";
import type { FeedbackKind } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { feedbackKindTone } from "@/lib/ui/state-tones";

// Card of a feedback or a topic: the kind first, then facts on one line
// (date, author, page, count) and an optional action at the end, then the
// content.
export function FeedbackCard({
  kind,
  facts,
  action,
  children,
}: {
  kind: FeedbackKind;
  facts: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <StatusBadge tone={feedbackKindTone[kind]} size="sm">
            {fr.feedback.kinds[kind]}
          </StatusBadge>
          {facts}
        </div>
        {action}
      </div>
      {children}
    </li>
  );
}
