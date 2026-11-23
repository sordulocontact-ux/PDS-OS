import { Avatar } from "@/components/ui/avatar";
import { recipient, senderOf } from "@/components/mailbox/mail-people";
import type { MailboxMessage } from "@/lib/mailbox/types";
import { brandDomainOf } from "@/lib/mailbox/sender-domain";
import { cn } from "@/lib/utils";

/**
 * Who a mail is with, as a mail app shows it (Sacha 23/11/2026): the sender
 * of a received mail, the first recipient of a sent one; a brand's icon
 * (read by PDS OS's server, /api/mailbox/icon), else the initials.
 */
export function MailAvatar({
  message,
  sender = false,
  className,
}: {
  message: MailboxMessage;
  // The sender even of a sent mail (the reading pane names the sender).
  sender?: boolean;
  className?: string;
}) {
  const who =
    !sender && message.folder === "sent" && message.to[0]
      ? recipient(message, message.to[0])
      : senderOf(message);
  const domain = brandDomainOf(who?.address ?? null);
  return (
    <Avatar
      name={who?.name || who?.address || "?"}
      pictureUrl={
        domain ? `/api/mailbox/icon?domain=${encodeURIComponent(domain)}` : null
      }
      contain
      className={cn("size-9", className)}
    />
  );
}
