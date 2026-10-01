"use client";

import { IconOffice, IconUser } from "nucleo-sharp-essential";

import { ContactActions } from "@/components/network/contact-actions";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { rolesText, type NetworkContactRow } from "@/lib/network/types";

// The network, by name: a person or an organization (its icon), what it
// does, how to reach it; the row opens its page, "⋯" edits or archives it.
export function NetworkTable({
  contacts,
  rights,
}: {
  contacts: NetworkContactRow[];
  rights: RecordRights;
}) {
  const t = fr.network;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.roles}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.contact}</DataTableHead>
        <DataTableHead hideBelow="sm" fill>
          {t.columns.city}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {contacts.map((contact) => (
          <DataTableRow key={contact.id}>
            <DataTableCell>
              <DataTableMedia
                visual={
                  <DataTableIcon
                    icon={contact.kind === "person" ? IconUser : IconOffice}
                  />
                }
                title={
                  <DataTableLink
                    href={
                      rights.archived ? null : routes.networkContact(contact.id)
                    }
                  >
                    {contact.name}
                  </DataTableLink>
                }
                subtitle={
                  <>
                    {/* The roles column is hidden under md. */}
                    <span className="md:hidden">
                      {rolesText(contact.roles)}
                    </span>
                    <span className="hidden md:inline">
                      {[
                        t.kinds[contact.kind],
                        contact.parentName && t.memberOf(contact.parentName),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              <span className="line-clamp-2 whitespace-normal">
                {rolesText(contact.roles)}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  {contact.email ?? contact.phone ?? EMPTY_CELL}
                </span>
                {contact.email && contact.phone && (
                  <span className="truncate text-sm text-muted-foreground">
                    {contact.phone}
                  </span>
                )}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="sm" fill>
              {contact.city ?? EMPTY_CELL}
            </DataTableCell>
            <DataTableActionsCell>
              <ContactActions contact={contact} rights={rights} />
            </DataTableActionsCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
