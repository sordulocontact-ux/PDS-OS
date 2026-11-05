import { PageSection } from "@/components/shell/page-section";
import { SectionRow, SectionRows } from "@/components/ui/section-rows";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { network } from "@/lib/i18n/fr/network";
import type { ContactCall, ContactCredit } from "@/lib/network/contact-history";
import { formatDateTime } from "@/lib/release/format";

const fr = { masterPage, network };

const linkClass = "font-semibold no-underline hover:underline";

/** A contact's credits on the catalog's titles and the calls they were
 * invited to (proto des pages, 29/10/2026); a card only when there is one. */
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
      {credits.length > 0 && (
        <PageSection
          card
          id="credits"
          title={p.credits}
          description={p.creditsDescription}
        >
          <SectionRows label={p.credits}>
            {credits.map((credit) => (
              <SectionRow
                key={`${credit.masterId}-${credit.role}`}
                title={
                  <ViewLink
                    href={routes.master(credit.masterId)}
                    className={linkClass}
                  >
                    {credit.title}
                  </ViewLink>
                }
                detail={fr.masterPage.credits.roles[credit.role]}
              />
            ))}
          </SectionRows>
        </PageSection>
      )}
      {calls.length > 0 && (
        <PageSection
          card
          id="calls"
          title={p.calls}
          description={p.callsDescription}
        >
          <SectionRows label={p.calls}>
            {calls.map((call) => (
              <SectionRow
                key={call.id}
                title={
                  <ViewLink href={routes.call(call.id)} className={linkClass}>
                    {call.title}
                  </ViewLink>
                }
                detail={formatDateTime(call.occurredAt)}
              />
            ))}
          </SectionRows>
        </PageSection>
      )}
    </>
  );
}
