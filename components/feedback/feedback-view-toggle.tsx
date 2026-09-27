import { ViewToggle } from "@/components/ui/view-toggle";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The director's two readings: by topic (PO's grouping) or every feedback
// as sent, in the URL (?view=all).
export function FeedbackViewToggle({ all }: { all: boolean }) {
  const t = fr.feedback.view;
  return (
    <ViewToggle
      label={t.label}
      options={[
        { href: routes.feedback, label: t.topics, current: !all },
        { href: `${routes.feedback}?view=all`, label: t.all, current: all },
      ]}
    />
  );
}
