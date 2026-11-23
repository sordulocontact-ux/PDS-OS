import { IconEnvelopeOpen } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { MailComposeButton } from "@/components/mailbox/mail-compose-button";
import { MailList } from "@/components/mailbox/mail-list";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { inboxEnabled } from "@/lib/email/inbox";
import { fr } from "@/lib/i18n/fr";
import { mailboxGmail } from "@/lib/i18n/fr/mailbox-gmail";
import { listGmail } from "@/lib/mailbox/gmail";
import { gmailAccounts } from "@/lib/mailbox/gmail-accounts";
import { MAILBOX_LIMIT, listMailbox } from "@/lib/mailbox/queries";
import {
  MAIL_KINDS,
  type MailKind,
  type MailboxMessage,
} from "@/lib/mailbox/types";
import { filterParam } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.mailbox.title} · ${fr.app.name}` };

const VIEWS = [
  { key: "received", param: "recus", folder: "inbox" },
  { key: "sent", param: "envoyes", folder: "sent" },
] as const;
const GMAIL_VIEW = "gmail";

/**
 * PO's mailbox (Sacha 23/11/2026): the mails PDS OS received and sent, as
 * the viewer may read them (their own; the direction's all). Views
 * Tous / Reçus / Envoyés, a filter by type, an instant search; a mail opens
 * in a side sheet. « Mon Gmail » (same day): the member's own Gmail accounts,
 * read live from Gmail when the view is open, seen by them only.
 */
export default async function MailPage({
  searchParams,
}: PageProps<"/app/mail">) {
  const [access, params] = await allInOrder([requireApproved(), searchParams]);
  const [mails, google] = await Promise.all([
    listMailbox(access),
    gmailAccounts(access),
  ]);
  const t = fr.mailbox;
  const hasGmail = google.accounts.length > 0;
  const onGmail = hasGmail && params.vue === GMAIL_VIEW;
  const view = onGmail
    ? null
    : (VIEWS.find((v) => v.param === params.vue) ?? null);
  const kind = MAIL_KINDS.find((k) => k === filterParam(params.type)) ?? null;
  const gmail = onGmail ? await listGmail(google.accounts) : null;

  if (mails.error)
    return (
      <SectionFrame title={t.title}>
        <FormMessage kind="error">{t.states.loadError}</FormMessage>
      </SectionFrame>
    );

  const { messages } = mails;
  // An empty box still lets one write (a member who has no mail yet).
  if (messages.length === 0 && !hasGmail)
    return (
      <SectionFrame
        title={t.title}
        action={inboxEnabled() ? <MailComposeButton /> : undefined}
      >
        <EmptyState
          icon={IconEnvelopeOpen}
          title={
            inboxEnabled() ? t.states.emptyTitle : t.states.notConnectedTitle
          }
          body={inboxEnabled() ? t.states.emptyBody : t.states.notConnectedBody}
        />
      </SectionFrame>
    );

  // The tabs count what the type filter keeps; the filter offers the types
  // the tab holds.
  const ofKind = (list: MailboxMessage[]) =>
    kind ? list.filter((m) => m.kinds.includes(kind)) : list;
  const inView: MailboxMessage[] = gmail
    ? gmail.messages
    : view
      ? messages.filter((m) => m.folder === view.folder)
      : messages;
  const present = new Set<MailKind>(inView.flatMap((m) => m.kinds));
  const vue = onGmail ? GMAIL_VIEW : (view?.param ?? null);
  const compose = <MailComposeButton />;

  return (
    <SectionFrame title={t.title} action={compose} toolsAction>
      <DataTableViews
        label={t.viewsLabel}
        pageAction={compose}
        views={[
          {
            href: viewHref(routes.mailbox, { type: kind }),
            label: t.views.all,
            count: ofKind(messages).length,
            current: !onGmail && view === null,
          },
          ...VIEWS.map((v) => ({
            href: viewHref(routes.mailbox, { vue: v.param, type: kind }),
            label: t.views[v.key],
            count: ofKind(messages).filter((m) => m.folder === v.folder).length,
            current: view?.key === v.key,
          })),
          ...(hasGmail
            ? [
                {
                  href: viewHref(routes.mailbox, {
                    vue: GMAIL_VIEW,
                    type: kind,
                  }),
                  label: mailboxGmail.view,
                  count: gmail ? ofKind(gmail.messages).length : undefined,
                  current: onGmail,
                },
              ]
            : []),
        ]}
      >
        {gmail && gmail.failed.length > 0 && (
          <FormMessage kind="error">
            {mailboxGmail.failed(gmail.failed)}
          </FormMessage>
        )}
        <MailList
          messages={ofKind(inView)}
          filters={
            present.size > 0 || kind ? (
              <UrlFilters
                path={routes.mailbox}
                params={{ vue }}
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
                    ? mailboxGmail.emptyTitle
                    : t.states.viewEmptyTitle(
                        view ? t.views[view.key] : t.views.all,
                      )
              }
              body={
                kind
                  ? t.states.filtersEmptyBody
                  : onGmail
                    ? mailboxGmail.emptyBody
                    : t.states.viewEmptyBody
              }
            />
          }
        />
        {!onGmail && mails.truncated && (
          <p className="text-sm text-muted-foreground">
            {t.states.truncated(MAILBOX_LIMIT)}
          </p>
        )}
      </DataTableViews>
    </SectionFrame>
  );
}
