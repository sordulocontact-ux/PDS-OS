"use client";

import { TemplatesTable } from "@/components/contracts/templates/templates-table";
import { SearchableList } from "@/components/ui/searchable-list";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";

const fr = { contracts, legalContracts };

// The templates of the Modèles tab with an instant search on name, type and
// usage, beside the page's filters.
export function TemplatesList({
  templates,
  organizationId,
  filters,
  empty,
}: {
  templates: TemplateSeries[];
  organizationId: string;
  filters?: React.ReactNode;
  empty?: React.ReactNode;
}) {
  const t = fr.legalContracts.templates.search;
  return (
    <SearchableList
      items={templates}
      searchText={(template) => [
        template.name,
        fr.contracts.types[template.type],
        template.usage,
      ]}
      label={t.label}
      placeholder={t.placeholder}
      noResult={t.noResult}
      filters={filters}
      empty={empty}
    >
      {(visible) => (
        <TemplatesTable templates={visible} organizationId={organizationId} />
      )}
    </SearchableList>
  );
}
