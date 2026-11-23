import { StatusBadge } from "@/components/ui/status-badge";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";

const fr = { mailbox };

/** Badges of a mail's types: what it is, at a glance. */
export function MailKindBadges({ message }: { message: MailboxMessage }) {
  return message.kinds.map((kind) => (
    <StatusBadge key={kind} tone="neutral" size="sm">
      {fr.mailbox.kinds[kind]}
    </StatusBadge>
  ));
}
