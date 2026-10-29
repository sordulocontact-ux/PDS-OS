"use client";

import { ContractsTable } from "@/components/contracts/contracts-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type { ContractRow } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

// Contracts with an instant search on title, parties, project and artist.
export function ContractsList({
  contracts,
  filters,
  empty,
}: {
  contracts: ContractRow[];
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.contracts.search;
  return (
    <SearchableList
      items={contracts}
      searchText={(c) => [
        c.title,
        fr.contracts.types[c.type],
        c.projectTitle,
        c.artistName,
        c.ownerName,
        ...c.parties,
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => <ContractsTable contracts={visible} />}
    </SearchableList>
  );
}
