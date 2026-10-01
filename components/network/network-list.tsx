"use client";

import { NetworkTable } from "@/components/network/network-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { RecordRights } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";
import { rolesText, type NetworkContactRow } from "@/lib/network/types";

// The network with an instant search on name, roles, organization and city.
export function NetworkList({
  contacts,
  rights,
}: {
  contacts: NetworkContactRow[];
  rights: RecordRights;
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
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
    >
      {(visible) => <NetworkTable contacts={visible} rights={rights} />}
    </SearchableList>
  );
}
