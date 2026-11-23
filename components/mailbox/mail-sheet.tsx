import { MailBody } from "@/components/mailbox/mail-body";
import { MailKindBadges } from "@/components/mailbox/mail-kind-badges";
import { recipient, senderOf, whoLine } from "@/components/mailbox/mail-people";
import { MailReplyButton } from "@/components/mailbox/mail-reply-button";
import { buttonVariants } from "@/components/ui/button";
import { SheetFacts, SheetHead } from "@/components/ui/side-sheet";
import { Timestamp } from "@/components/ui/timestamp";
import { ViewLink } from "@/components/ui/view-link";
import { formatFileSize } from "@/lib/catalog/file-rules";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";
import { formatInstant } from "@/lib/utils/instant";

const fr = { mailbox };

const downloadHref = (id: string, part: string) =>
  `/api/mailbox/${id}/attachments/${encodeURIComponent(part)}`;

/**
 * A mail in the side sheet: received or sent and when, its types, who,
 * where PDS OS filed it, its files, then its text and « Répondre ».
 */
export function MailSheet({ message }: { message: MailboxMessage }) {
  const t = fr.mailbox.sheet;
  const sender = senderOf(message);
  const people = (addresses: string[]) =>
    addresses.map((a) => whoLine(recipient(message, a))).join(", ");
  const facts = [
    ...(sender ? [{ label: t.from, value: whoLine(sender) }] : []),
    ...(message.to.length ? [{ label: t.to, value: people(message.to) }] : []),
    ...(message.cc.length ? [{ label: t.cc, value: people(message.cc) }] : []),
    { label: t.date, value: formatInstant(message.sentAt) },
  ];

  return (
    <>
      <SheetHead
        eyebrow={
          <>
            {message.folder === "sent" ? t.sent : t.received} ·{" "}
            <Timestamp iso={message.sentAt} />
          </>
        }
        caption={
          message.kinds.length > 0 && <MailKindBadges message={message} />
        }
      />
      <SheetFacts facts={facts} />
      {message.link && (
        <div>
          <ViewLink
            href={message.link.href}
            className={buttonVariants({ variant: "outline" })}
          >
            {message.link.label}
          </ViewLink>
        </div>
      )}
      {message.attachments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-caption text-[color:var(--text-tertiary)]">
            {t.attachments}
          </h3>
          <ul className="flex flex-col gap-1">
            {message.attachments.map((file) => (
              <li key={file.part} className="flex items-baseline gap-2">
                <a
                  href={downloadHref(message.id, file.part)}
                  download
                  aria-label={t.download(file.name)}
                  className="min-w-0 truncate underline-offset-2 hover:underline"
                >
                  {file.name}
                </a>
                {file.size > 0 && (
                  <span className="shrink-0 text-caption text-[color:var(--text-tertiary)]">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <MailBody id={message.id} />
      <div>
        <MailReplyButton message={message} />
      </div>
    </>
  );
}
