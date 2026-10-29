import { CardRow, ListCard } from "@/components/ui/list-card";
import { routes } from "@/lib/auth/redirects";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { network } from "@/lib/i18n/fr/network";
import type { ContactCall, ContactCredit } from "@/lib/network/contact-history";
import { formatDateTime } from "@/lib/release/format";

const fr = { masterPage, network };

/** A contact's credits on the catalog's titles and the calls they were
 * invited to (proto des pages, 29/10/2026). */
export function ContactHistory({
  credits,
  calls,
}: {
  credits: ContactCredit[];
  calls: ContactCall[];
}) {
  const p = fr.network.page;
  return (
    <>
      <ListCard
        title={p.credits}
        empty={credits.length === 0 ? p.creditsEmpty : undefined}
      >
        {credits.map((credit) => (
          <CardRow
            key={`${credit.masterId}-${credit.role}`}
            href={routes.master(credit.masterId)}
            main={credit.title}
            sub={fr.masterPage.credits.roles[credit.role]}
          />
        ))}
      </ListCard>
      <ListCard
        title={p.calls}
        empty={calls.length === 0 ? p.callsEmpty : undefined}
      >
        {calls.map((call) => (
          <CardRow
            key={call.id}
            href={routes.meeting(call.id)}
            main={call.title}
            sub={formatDateTime(call.occurredAt)}
          />
        ))}
      </ListCard>
    </>
  );
}
