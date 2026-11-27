"use client";

import { IconOffice, IconUser } from "nucleo-sharp-essential";

import { RecordSelection } from "@/components/archive/record-selection";
import { ContactActions } from "@/components/network/contact-actions";
import { ContactSheet } from "@/components/network/contact-sheet";
import { AddToListButton } from "@/components/network/lists/add-to-list-button";
import { Avatar } from "@/components/ui/avatar";
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
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { SelectAllHead, SelectRowCell } from "@/components/ui/row-selection";
import { TableSortProvider } from "@/components/ui/table-sort";
import { useSheetRow } from "@/components/ui/use-sheet-row";
import type { RecordRights } from "@/lib/archive/types";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/auth/redirects";
import { network } from "@/lib/i18n/fr/network";
import { records } from "@/lib/i18n/fr/records";
import type { NetworkListOption } from "@/lib/network/lists-types";
import {
  relationsText,
  rolesText,
  type NetworkContactRow,
} from "@/lib/network/types";

const fr = { network, records };

// A link in a cell, above the row's stretched link (its name opens the
// sheet).
const CELL_LINK =
  "relative z-10 block max-w-48 truncate outline-none hover:underline focus-visible:underline";

// The network, by name: a person or an organization (its icon), what it
// does, how to reach it; the row opens its side sheet (ContactSheet, after
// Accordee, Sacha 24/11/2026) and from there its page, "⋯" edits, archives or
// deletes it, checkboxes delete several at once (director) and add them to
// a list (`lists`: who manages the Réseau, Ibé 18/11/2026).
export function NetworkTable({
  contacts,
  projects,
  rights,
  lists = null,
}: {
  contacts: NetworkContactRow[];
  // Each contact's projects, by title.
  projects: Record<string, string[]>;
  rights: RecordRights;
  // The lists the ticked people can join; null: no « Ajouter à une liste ».
  lists?: NetworkListOption[] | null;
}) {
  const t = fr.network;
  const selection = fr.records.selection;
  const withSelection = rights.canArchive || lists !== null;
  const [sheet, setSheet] = useSheetRow(contacts.map((c) => c.id));

  const table = (
    <DataTable>
      <DataTableHeader>
        {withSelection && <SelectAllHead label={selection.all} />}
        {/* One fact a column (after Accordee, Sacha 24/11/2026); no column
            takes the rest: the width is shared evenly (Sacha, 29/10). */}
        <DataTableHead icon="contact">{t.columns.name}</DataTableHead>
        <DataTableHead icon="role" hideBelow="md">
          {t.columns.roles}
        </DataTableHead>
        <DataTableHead icon="relation" hideBelow="lg">
          {t.columns.relations}
        </DataTableHead>
        <DataTableHead icon="project" hideBelow="xl">
          {t.columns.projects}
        </DataTableHead>
        <DataTableHead icon="email" hideBelow="lg">
          {t.columns.email}
        </DataTableHead>
        <DataTableHead icon="phone" hideBelow="xl">
          {t.columns.phone}
        </DataTableHead>
        <DataTableHead icon="city" hideBelow="2xl">
          {t.columns.city}
        </DataTableHead>
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {contacts.map((contact, index) => (
          <DataTableRow key={contact.id}>
            {withSelection && (
              <SelectRowCell
                row={{ id: contact.id, name: contact.name }}
                label={selection.row(contact.name)}
              />
            )}
            <DataTableCell>
              <DataTableMedia
                visual={
                  // Its picture, or the icon of its kind without one.
                  contact.pictureUrl ? (
                    <Avatar
                      name={contact.name}
                      pictureUrl={contact.pictureUrl}
                      className="size-9"
                    />
                  ) : (
                    <DataTableIcon
                      icon={contact.kind === "person" ? IconUser : IconOffice}
                      className="size-9 justify-center"
                    />
                  )
                }
                title={
                  <DataTableLink
                    href={
                      rights.archived ? null : routes.networkContact(contact.id)
                    }
                    onOpen={rights.archived ? undefined : () => setSheet(index)}
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
                    {/* Where it belongs; a spotted artist without one, its
                        TikTok. Person or organization: the tabs and the
                        icon say it. */}
                    <span className="hidden md:inline">
                      {contact.parentName
                        ? t.memberOf(contact.parentName)
                        : contact.tiktok && `@${contact.tiktok}`}
                    </span>
                  </>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              <DataTableText>
                {rolesText(contact.roles) || EMPTY_CELL}
              </DataTableText>
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              <DataTableText>
                {relationsText(contact.relations) || EMPTY_CELL}
              </DataTableText>
            </DataTableCell>
            <DataTableCell hideBelow="xl">
              <DataTableText>
                {projects[contact.id]?.join(", ") || EMPTY_CELL}
              </DataTableText>
            </DataTableCell>
            <DataTableCell hideBelow="lg">
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className={CELL_LINK}>
                  {contact.email}
                </a>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="xl">
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className={cn(CELL_LINK, "tabular-nums")}
                >
                  {contact.phone}
                </a>
              ) : (
                EMPTY_CELL
              )}
            </DataTableCell>
            <DataTableCell hideBelow="2xl">
              {contact.city ?? EMPTY_CELL}
            </DataTableCell>
            <DataTableActionsCell>
              <ContactActions contact={contact} rights={rights} reveal />
            </DataTableActionsCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );

  // One sort for the table and its sheet: ↑ ↓ follow the rows as sorted.
  const sorted = (
    <TableSortProvider>
      {table}
      <ContactSheet
        contacts={contacts}
        rights={rights}
        index={sheet}
        onClose={() => setSheet(null)}
        onMove={setSheet}
      />
    </TableSortProvider>
  );

  return withSelection ? (
    <RecordSelection
      kind="contact"
      archived={rights?.archived}
      manage={rights.canArchive}
      actions={lists && <AddToListButton lists={lists} />}
    >
      {sorted}
    </RecordSelection>
  ) : (
    sorted
  );
}
