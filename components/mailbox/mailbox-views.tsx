"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { MailList } from "@/components/mailbox/mail-list";
import { useMyGmail } from "@/components/mailbox/use-my-gmail";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { UrlFilters } from "@/components/ui/url-filters";
import { routes } from "@/lib/auth/redirects";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import { mailboxGmail } from "@/lib/i18n/fr/mailbox-gmail";
import {
  MAIL_KINDS,
  type MailKind,
  type MailboxMessage,
} from "@/lib/mailbox/types";
import { viewHref } from "@/lib/ui/view-href";

const fr = { mailbox, mailboxGmail };

export const MAIL_VIEWS = [
  { key: "received", param: "recus", folder: "inbox" },
  { key: "sent", param: "envoyes", folder: "sent" },
] as const;
export const GMAIL_VIEW = "gmail";

/**
 * The views, the type filter and the mails of the page « Mails »: PDS OS's
 * box (read with the page) and the member's own Gmail (asked once the page
 * shows, useMyGmail), merged newest first in Tous, Reçus and Envoyés, alone
 * in « Mon Gmail ». The counts and the list grow when Gmail answers.
 */
export function MailboxViews({
  box,
  truncated,
  hasGmail,
  vue,
  kind,
  compose,
}: {
  box: MailboxMessage[];
  // The note under the list when PDS OS's box is cut, else null.
  truncated: string | null;
  hasGmail: boolean;
  vue: string | null;
  kind: MailKind | null;
  compose: ReactNode;
}) {
  const t = fr.mailbox;
  const g = fr.mailboxGmail;
  const gmail = useMyGmail(hasGmail);
  const onGmail = hasGmail && vue === GMAIL_VIEW;
  const view = onGmail
    ? null
    : (MAIL_VIEWS.find((v) => v.param === vue) ?? null);
  const mine = gmail.state === "ready" ? gmail.messages : [];
  const all = [...box, ...mine].sort((a, b) =>
    b.sentAt.localeCompare(a.sentAt),
  );
  const ofKind = (list: MailboxMessage[]) =>
    kind ? list.filter((m) => m.kinds.includes(kind)) : list;
  const inView = onGmail
    ? mine
    : view
      ? all.filter((m) => m.folder === view.folder)
      : all;
  const present = new Set<MailKind>(inView.flatMap((m) => m.kinds));
  const waiting = gmail.state === "loading";

  return (
    <DataTableViews
      label={t.viewsLabel}
      pageAction={compose}
      views={[
        {
          href: viewHref(routes.mailbox, { type: kind }),
          label: t.views.all,
          count: ofKind(all).length,
          current: !onGmail && view === null,
        },
        ...MAIL_VIEWS.map((v) => ({
          href: viewHref(routes.mailbox, { vue: v.param, type: kind }),
          label: t.views[v.key],
          count: ofKind(all).filter((m) => m.folder === v.folder).length,
          current: view?.key === v.key,
        })),
        ...(hasGmail
          ? [
              {
                href: viewHref(routes.mailbox, { vue: GMAIL_VIEW, type: kind }),
                label: g.view,
                count: waiting ? undefined : ofKind(mine).length,
                current: onGmail,
              },
            ]
          : []),
      ]}
    >
      {gmail.state === "ready" && gmail.failed.length > 0 && (
        <FormMessage kind="error">{g.failed(gmail.failed)}</FormMessage>
      )}
      {waiting && inView.length === 0 ? (
        // Gmail is being read, and nothing else to show meanwhile.
        <div
          role="status"
          aria-label={g.loading}
          className="flex flex-col gap-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <MailList
          messages={ofKind(inView)}
          filters={
            present.size > 0 || kind ? (
              <UrlFilters
                path={routes.mailbox}
                params={{ vue: onGmail ? GMAIL_VIEW : (view?.param ?? null) }}
                groups={[
                  {
                    key: "type",
                    label: t.filters.kindLabel,
                    allLabel: t.filters.kindAll,
                    options: MAIL_KINDS.filter((k) => present.has(k)).map(
                      (k) => ({ value: k, label: t.kinds[k] }),
                    ),
                    current: kind,
                  },
                ]}
              />
            ) : undefined
          }
          empty={
            <EmptyState
              icon={IconEnvelopeOpen}
              title={
                kind
                  ? t.states.filtersEmpty
                  : onGmail
                    ? g.emptyTitle
                    : view
                      ? t.states.viewEmptyTitle(t.views[view.key])
                      : t.states.emptyTitle
              }
              body={
                kind
                  ? t.states.filtersEmptyBody
                  : onGmail
                    ? g.emptyBody
                    : view
                      ? t.states.viewEmptyBody
                      : t.states.emptyBody
              }
            />
          }
        />
      )}
      {!onGmail && truncated && (
        <p className="text-sm text-muted-foreground">{truncated}</p>
      )}
    </DataTableViews>
  );
}
