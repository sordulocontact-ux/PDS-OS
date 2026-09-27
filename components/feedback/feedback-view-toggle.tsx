import { ViewToggle } from "@/components/ui/view-toggle";
import { routes } from "@/lib/auth/redirects";
import type { TopicStatus } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

export type FeedbackView = TopicStatus | "all";

// The director's readings: topics to review, sent, dismissed (with their
// counts, computed by code), or every feedback as sent. In the URL (?view=).
export function FeedbackViewToggle({
  view,
  counts,
}: {
  view: FeedbackView;
  counts: Record<TopicStatus, number>;
}) {
  const t = fr.feedback.view;
  const href = (v: FeedbackView) =>
    v === "new" ? routes.feedback : `${routes.feedback}?view=${v}`;
  return (
    <ViewToggle
      label={t.label}
      options={[
        {
          href: href("new"),
          label: t.new(counts.new),
          current: view === "new",
        },
        {
          href: href("sent"),
          label: t.sent(counts.sent),
          current: view === "sent",
        },
        {
          href: href("dismissed"),
          label: t.dismissed(counts.dismissed),
          current: view === "dismissed",
        },
        { href: href("all"), label: t.all, current: view === "all" },
      ]}
    />
  );
}
