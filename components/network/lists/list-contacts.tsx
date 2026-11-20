"use client";

import { IconOffice, IconUser, IconXmark } from "nucleo-sharp-essential";
import { useTransition } from "react";

import { ReplyToggle } from "@/components/network/lists/reply-toggle";
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
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { SearchableList } from "@/components/ui/searchable-list";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import { records } from "@/lib/i18n/fr/records";
import { removeContactFromNetworkList } from "@/lib/network/lists-actions";
import type { NetworkListReply } from "@/lib/network/lists-types";
import { rolesText, type NetworkContactRow } from "@/lib/network/types";

const fr = { networkLists, records };

export type ListContact = NetworkContactRow & { reply: NetworkListReply };

/**
 * The people of a list (Ibé, 18/11/2026), searched as typed: picture and
 * name (its fiche), what it does, how to reach it (only what the viewer may
 * read: a private contact's coordinates stay hidden), its reply, switched in
 * one click; « ⋯ » « Retirer de la liste » for who keeps it up.
 */
export function ListContacts({
  listId,
  contacts,
  canWrite,
}: {
  listId: string;
  contacts: ListContact[];
  canWrite: boolean;
}) {
  const t = fr.networkLists;
  return (
    <SearchableList
      items={contacts}
      searchText={(c) => [c.name, rolesText(c.roles), c.parentName, c.city]}
      label={t.search.label}
      placeholder={t.search.placeholder}
      noResult={t.search.noResult}
    >
      {(visible) => (
        <DataTable>
          <DataTableHeader>
            <DataTableHead>{t.people.name}</DataTableHead>
            <DataTableHead hideBelow="md">{t.people.contact}</DataTableHead>
            <DataTableHead fill>{t.people.reply}</DataTableHead>
            {canWrite && (
              <DataTableActionsHead label={fr.records.menu.column} />
            )}
          </DataTableHeader>
          <DataTableBody>
            {visible.map((contact) => (
              <DataTableRow key={contact.id}>
                <DataTableCell>
                  <DataTableMedia
                    visual={
                      contact.pictureUrl ? (
                        <Avatar
                          name={contact.name}
                          pictureUrl={contact.pictureUrl}
                          className="size-9"
                        />
                      ) : (
                        <DataTableIcon
                          icon={
                            contact.kind === "person" ? IconUser : IconOffice
                          }
                        />
                      )
                    }
                    title={
                      <DataTableLink href={routes.networkContact(contact.id)}>
                        {contact.name}
                      </DataTableLink>
                    }
                    subtitle={rolesText(contact.roles) || undefined}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  {contact.email ??
                    contact.phone ??
                    (contact.tiktok ? `@${contact.tiktok}` : EMPTY_CELL)}
                </DataTableCell>
                <DataTableCell fill>
                  <ReplyToggle
                    listId={listId}
                    contactId={contact.id}
                    name={contact.name}
                    reply={contact.reply}
                    canChange={canWrite}
                  />
                </DataTableCell>
                {canWrite && (
                  <DataTableActionsCell>
                    <RemoveAction listId={listId} contact={contact} />
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </SearchableList>
  );
}

// At once: added back as easily, and its fiche is untouched.
function RemoveAction({
  listId,
  contact,
}: {
  listId: string;
  contact: ListContact;
}) {
  const t = fr.networkLists.people;
  const [, startTransition] = useTransition();
  return (
    <RowActions
      label={t.menu(contact.name)}
      reveal
      actions={[
        {
          key: "remove",
          label: t.remove,
          icon: IconXmark,
          onSelect: () =>
            startTransition(async () => {
              const result = await removeContactFromNetworkList({
                listId,
                contactId: contact.id,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success(t.removed);
            }),
        },
      ]}
    />
  );
}
