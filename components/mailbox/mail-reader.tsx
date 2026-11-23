import { IconPaperclip } from "nucleo-sharp-essential";

import { MailAvatar } from "@/components/mailbox/mail-avatar";
import { MailBody } from "@/components/mailbox/mail-body";
import { MailKindBadges } from "@/components/mailbox/mail-kind-badges";
import { recipient, senderOf, whoLine } from "@/components/mailbox/mail-people";
import { MailReplyButton } from "@/components/mailbox/mail-reply-button";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { formatFileSize } from "@/lib/catalog/file-rules";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import { mailboxGmail } from "@/lib/i18n/fr/mailbox-gmail";
import type { MailboxMessage } from "@/lib/mailbox/types";
import { formatInstant } from "@/lib/utils/instant";

const fr = { mailbox, mailboxGmail };

// A file of PDS OS's box, or of « Mon Gmail » (read from the member's own
// account).
const downloadHref = (message: MailboxMessage, part: string) =>
  message.gmail
    ? `/api/mailbox/gmail/${encodeURIComponent(message.gmail.account)}/${encodeURIComponent(message.gmail.id)}/${encodeURIComponent(part)}`
    : `/api/mailbox/${message.id}/attachments/${encodeURIComponent(part)}`;

/**
 * A mail as a mail app shows it (Outlook, Sacha 23/11/2026), in the reading
 * pane beside the list or, on a phone, in the side sheet: its subject (the
 * sheet's title already says it: `subject={false}`) and types; who wrote it
 * to whom, and when; the gestures (« Répondre », where PDS OS filed it);
 * the files joined; its text.
 */
export function MailReader({
  message,
  subject = true,
}: {
  message: MailboxMessage;
  subject?: boolean;
}) {
  const t = fr.mailbox;
  const sender = senderOf(message);
  const senderName = sender ? sender.name || sender.address : t.noName;
  const people = (addresses: string[]) =>
    addresses.map((a) => whoLine(recipient(message, a))).join(", ");

  return (
    <article className="flex flex-col gap-5">
      {(subject || message.kinds.length > 0) && (
        <header className="flex flex-col gap-2">
          {subject && (
            <h2 className="text-display-sm font-medium break-words">
              {message.subject || t.noSubject}
            </h2>
          )}
          {message.kinds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <MailKindBadges message={message} />
            </div>
          )}
        </header>
      )}
      <div className="flex items-start gap-3">
        <MailAvatar message={message} sender className="size-10" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* The day goes under the name when the pane is narrow. */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <p className="min-w-0 flex-[1_1_12rem]">
              <span className="font-medium">{senderName}</span>
              {sender?.name && sender.name !== sender.address && (
                <span className="break-all text-[color:var(--text-tertiary)]">
                  {" "}
                  &lt;{sender.address}&gt;
                </span>
              )}
            </p>
            <span className="shrink-0 text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
              {formatInstant(message.sentAt)}
            </span>
          </div>
          {[
            [t.sheet.to, message.to],
            [t.sheet.cc, message.cc],
          ].map(([label, list]) =>
            list.length > 0 ? (
              <p
                key={label as string}
                className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] break-all text-[color:var(--text-secondary)]"
              >
                {label} : {people(list as string[])}
              </p>
            ) : null,
          )}
          {/* « Mon Gmail »: the account it is read from. */}
          {message.gmail && (
            <p className="text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
              {fr.mailboxGmail.account(message.gmail.email)}
            </p>
          )}
        </div>
      </div>
      {/* « Répondre » sends from PDS OS's box: not for a mail of one's own
          Gmail, read only. */}
      {(!message.gmail || message.link) && (
        <div className="flex flex-wrap gap-2">
          {!message.gmail && <MailReplyButton message={message} />}
          {message.link && (
            <ViewLink
              href={message.link.href}
              className={buttonVariants({ variant: "outline" })}
            >
              {message.link.label}
            </ViewLink>
          )}
        </div>
      )}
      {message.attachments.length > 0 && (
        <ul aria-label={t.sheet.attachments} className="flex flex-wrap gap-2">
          {message.attachments.map((file) => (
            <li key={file.part} className="max-w-full min-w-0">
              <a
                href={downloadHref(message, file.part)}
                download
                aria-label={t.sheet.download(file.name)}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-[color:var(--border-hairline)] px-3 py-2 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none hover:bg-[var(--control-bg-hover)] focus-visible:bg-[var(--control-bg-hover)]"
              >
                <IconPaperclip
                  aria-hidden
                  className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
                />
                <span className="min-w-0 truncate">{file.name}</span>
                {file.size > 0 && (
                  <span className="shrink-0 text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-[color:var(--border-hairline)] pt-5">
        <MailBody message={message} />
      </div>
    </article>
  );
}
