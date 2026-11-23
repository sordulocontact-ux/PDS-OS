"use client";

import { MailInbox } from "@/components/mailbox/mail-inbox";
import { searchTextOf } from "@/components/mailbox/mail-people";
import { SearchableList } from "@/components/ui/searchable-list";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";

const fr = { mailbox };

/** The mails with an instant search on subject, correspondents and text. */
export function MailList({
  messages,
  filters,
  empty,
}: {
  messages: MailboxMessage[];
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.mailbox.search;
  return (
    <SearchableList
      items={messages}
      searchText={searchTextOf}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => <MailInbox messages={visible} />}
    </SearchableList>
  );
}
