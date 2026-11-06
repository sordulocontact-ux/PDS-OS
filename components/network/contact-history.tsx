import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { routes } from "@/lib/auth/redirects";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { network } from "@/lib/i18n/fr/network";
import type { ContactCall, ContactCredit } from "@/lib/network/contact-history";
import { formatDateTime } from "@/lib/release/format";

const fr = { masterPage, network };

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
          <DataTable framed>
            <DataTableHeader>
              <DataTableHead>{p.columns.title}</DataTableHead>
              <DataTableHead fill>{p.columns.role}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {credits.map((credit) => (
                <DataTableRow key={`${credit.masterId}-${credit.role}`}>
                  <DataTableCell>
                    <DataTableLink href={routes.master(credit.masterId)}>
                      {credit.title}
                    </DataTableLink>
                  </DataTableCell>
                  <DataTableCell fill>
                    {fr.masterPage.credits.roles[credit.role]}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </PageSection>
      )}
      {calls.length > 0 && (
        <PageSection
          card
          id="calls"
          title={p.calls}
          description={p.callsDescription}
        >
          <DataTable framed>
            <DataTableHeader>
              <DataTableHead>{p.columns.call}</DataTableHead>
              <DataTableHead fill>{p.columns.date}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {calls.map((call) => (
                <DataTableRow key={call.id}>
                  <DataTableCell>
                    <DataTableLink href={routes.call(call.id)}>
                      {call.title}
                    </DataTableLink>
                  </DataTableCell>
                  <DataTableCell fill className="tabular-nums">
                    {formatDateTime(call.occurredAt)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </PageSection>
      )}
    </>
  );
}
