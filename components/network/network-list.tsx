"use client";

import { NetworkTable } from "@/components/network/network-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { RecordRights } from "@/lib/archive/types";
import type { NetworkListOption } from "@/lib/network/lists-types";
import { network } from "@/lib/i18n/fr/network";
import { rolesText, type NetworkContactRow } from "@/lib/network/types";

const fr = { network };

// The network with an instant search on name, roles, organization, city,
// e-mail, TikTok handle and projects.
export function NetworkList({
  contacts,
  projects,
  rights,
  lists = null,
  filters,
  empty,
}: {
  contacts: NetworkContactRow[];
  projects: Record<string, string[]>;
  rights: RecordRights;
  // « Ajouter à une liste » on the ticked people (NetworkTable).
  lists?: NetworkListOption[] | null;
  // The page's filters, beside the search; what stands for no row at all.
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.network.search;
  return (
    <SearchableList
      items={contacts}
      searchText={(c) => [
        c.name,
        rolesText(c.roles),
        c.parentName,
        c.city,
        c.email,
        c.tiktok,
        ...(projects[c.id] ?? []),
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <NetworkTable
          contacts={visible}
          projects={projects}
          rights={rights}
          lists={lists}
        />
      )}
    </SearchableList>
  );
}
