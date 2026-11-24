import { IconEnvelopeOpen } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { MailComposeButton } from "@/components/mailbox/mail-compose-button";
import { MailboxViews } from "@/components/mailbox/mailbox-views";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { requireApproved } from "@/lib/auth/dal";
import { inboxEnabled } from "@/lib/email/inbox";
import { fr } from "@/lib/i18n/fr";
import { gmailAccounts } from "@/lib/mailbox/gmail-accounts";
import { MAILBOX_LIMIT, listMailbox } from "@/lib/mailbox/queries";
import { MAIL_KINDS } from "@/lib/mailbox/types";
import { filterValues } from "@/lib/ui/filter-options";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.mailbox.title} · ${fr.app.name}` };

/**
 * PO's mailbox (Sacha 23/11/2026): the mails PDS OS received and sent, as
 * the viewer may read them (their own; the direction's all), with the
 * member's own Gmail accounts (seen by them only) in Tous, Reçus and
 * Envoyés, alone in « Mon Gmail ». The page reads the database only and
 * shows at once; Gmail is asked once it shows (MailboxViews). A mail opens
 * beside the list, as Outlook.
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

  if (mails.error)
    return (
      <SectionFrame title={t.title}>
        <FormMessage kind="error">{t.states.loadError}</FormMessage>
      </SectionFrame>
    );

  // An empty box still lets one write (a member who has no mail yet).
  if (mails.messages.length === 0 && !hasGmail)
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

  const compose = <MailComposeButton />;
  const vue = typeof params.vue === "string" ? params.vue : null;
  return (
    <SectionFrame title={t.title} action={compose} toolsAction>
      <MailboxViews
        box={mails.messages}
        truncated={mails.truncated ? t.states.truncated(MAILBOX_LIMIT) : null}
        hasGmail={hasGmail}
        vue={vue}
        kinds={MAIL_KINDS.filter((k) => filterValues(params.type).includes(k))}
        compose={compose}
      />
    </SectionFrame>
  );
}
