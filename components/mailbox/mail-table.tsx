"use client";

import { IconPaperclip } from "nucleo-sharp-essential";

import { correspondentOf } from "@/components/mailbox/mail-people";
import { MailKindBadges } from "@/components/mailbox/mail-kind-badges";
import { MailSheet } from "@/components/mailbox/mail-sheet";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { SideSheet } from "@/components/ui/side-sheet";
import { Timestamp } from "@/components/ui/timestamp";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";

const fr = { mailbox };

/**
 * The mails, newest first: who, the subject over the start of the text, its
 * types, a paperclip when files are joined, the day. A row opens the mail in
 * a side sheet (same as Finance's rows).
 */
export function MailTable({ messages }: { messages: MailboxMessage[] }) {
  const t = fr.mailbox;
  const [sheet, setSheet] = useSheetRow(messages.map((m) => m.id));
  const open = sheet !== null ? messages[sheet] : undefined;

  return (
    <>
      <DataTable>
        <DataTableHeader>
          <DataTableHead hideBelow="md">
            {t.columns.correspondent}
          </DataTableHead>
          <DataTableHead fill>{t.columns.subject}</DataTableHead>
          <DataTableHead hideBelow="lg">{t.columns.kinds}</DataTableHead>
          <DataTableHead hideBelow="sm" align="end">
            {t.columns.date}
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {messages.map((message, index) => {
            const who = correspondentOf(message);
            return (
              <DataTableRow key={message.id}>
                <DataTableCell hideBelow="md">
                  <span className="block truncate">{who}</span>
                </DataTableCell>
                <DataTableCell>
                  <DataTableMedia
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <DataTableLink
                          href={null}
                          onOpen={() => setSheet(index)}
                        >
                          {message.subject || t.noSubject}
                        </DataTableLink>
                        {message.attachments.length > 0 && (
                          <IconPaperclip
                            aria-label={t.attachmentsLabel(
                              message.attachments.length,
                            )}
                            className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
                          />
                        )}
                      </span>
                    }
                    subtitle={
                      <>
                        {/* The correspondent column is hidden under md. */}
                        <span className="md:hidden">{who} · </span>
                        {message.snippet}
                      </>
                    }
                  />
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  <div className="flex flex-wrap gap-1">
                    <MailKindBadges message={message} />
                  </div>
                </DataTableCell>
                <DataTableCell hideBelow="sm" align="end">
                  <Timestamp
                    iso={message.sentAt}
                    show="short"
                    className="text-[color:var(--text-secondary)]"
                  />
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      {open && sheet !== null && (
        <SideSheet
          open
          onClose={() => setSheet(null)}
          title={open.subject || t.noSubject}
          index={sheet}
          total={messages.length}
          onMove={setSheet}
        >
          <MailSheet key={open.id} message={open} />
        </SideSheet>
      )}
    </>
  );
}
