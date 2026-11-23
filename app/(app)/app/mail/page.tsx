import { IconEnvelopeOpen } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { MailList } from "@/components/mailbox/mail-list";
import { MailComposeButton } from "@/components/mailbox/mail-compose-button";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { inboxEnabled } from "@/lib/email/inbox";
import { fr } from "@/lib/i18n/fr";
import { MAILBOX_LIMIT, listMailbox } from "@/lib/mailbox/queries";
import { MAIL_KINDS, type MailKind } from "@/lib/mailbox/types";
import { filterParam } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.mailbox.title} · ${fr.app.name}` };

const VIEWS = [
  { key: "received", param: "recus", folder: "inbox" },
  { key: "sent", param: "envoyes", folder: "sent" },
] as const;

/**
 * PO's mailbox (Sacha 23/11/2026): the mails PDS OS received and sent, as
 * the viewer may read them (their own; the direction's all). Views
 * Tous / Reçus / Envoyés, a filter by type, an instant search; a mail opens
 * in a side sheet.
 */
export default async function MailPage({
  searchParams,
}: PageProps<"/app/mail">) {
  const [access, params] = await allInOrder([requireApproved(), searchParams]);
  const mails = await listMailbox(access);
  const t = fr.mailbox;
  const view = VIEWS.find((v) => v.param === params.vue) ?? null;
  const kind = MAIL_KINDS.find((k) => k === filterParam(params.type)) ?? null;

  if (mails.error)
    return (
      <SectionFrame title={t.title}>
        <FormMessage kind="error">{t.states.loadError}</FormMessage>
      </SectionFrame>
    );

  const { messages } = mails;
  // An empty box still lets one write (a member who has no mail yet).
  if (messages.length === 0)
    return (
      <SectionFrame
        title={t.title}
        action={inboxEnabled() ? <MailComposeButton /> : undefined}
      >
        {inboxEnabled() ? (
          <EmptyState
            icon={IconEnvelopeOpen}
            title={t.states.emptyTitle}
            body={t.states.emptyBody}
          />
        ) : (
          <EmptyState
            icon={IconEnvelopeOpen}
            title={t.states.notConnectedTitle}
            body={t.states.notConnectedBody}
          />
        )}
      </SectionFrame>
    );

  // The tabs count what the type filter keeps; the filter offers the types
  // the tab holds.
  const ofKind = (list: typeof messages) =>
    kind ? list.filter((m) => m.kinds.includes(kind)) : list;
  const inView = (list: typeof messages) =>
    view ? list.filter((m) => m.folder === view.folder) : list;
  const shown = ofKind(inView(messages));
  const present = new Set<MailKind>(inView(messages).flatMap((m) => m.kinds));
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
            current: view === null,
          },
          ...VIEWS.map((v) => ({
            href: viewHref(routes.mailbox, { vue: v.param, type: kind }),
            label: t.views[v.key],
            count: ofKind(messages).filter((m) => m.folder === v.folder).length,
            current: view?.key === v.key,
          })),
        ]}
      >
        <MailList
          messages={shown}
          filters={
            present.size > 0 || kind ? (
              <UrlFilters
                path={routes.mailbox}
                params={{ vue: view?.param ?? null }}
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
            kind ? (
              <EmptyState
                icon={IconEnvelopeOpen}
                title={t.states.filtersEmpty}
                body={t.states.filtersEmptyBody}
              />
            ) : (
              <EmptyState
                icon={IconEnvelopeOpen}
                title={t.states.viewEmptyTitle(
                  view ? t.views[view.key] : t.views.all,
                )}
                body={t.states.viewEmptyBody}
              />
            )
          }
        />
        {mails.truncated && (
          <p className="text-sm text-muted-foreground">
            {t.states.truncated(MAILBOX_LIMIT)}
          </p>
        )}
      </DataTableViews>
    </SectionFrame>
  );
}
