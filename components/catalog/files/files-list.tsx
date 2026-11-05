"use client";

import { FilesTable } from "@/components/catalog/files/files-table";
import { SearchableList } from "@/components/ui/searchable-list";
import type {
  CatalogFile,
  FileOwner,
  FileWriteScope,
} from "@/lib/catalog/file-rules";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

// A library's files with the instant search every list has (as the global
// library, LibraryList): name, precision, category, author.
export function FilesList({
  files,
  ...table
}: {
  owner: FileOwner;
  files: CatalogFile[];
  canEdit: boolean;
  organizationId?: string | null;
  scope?: FileWriteScope | null;
}) {
  const t = fr.catalogFiles;
  const labels: Record<string, string> = t.categories[table.owner.kind];
  return (
    <SearchableList
      items={files}
      searchText={(f) => [
        f.fileName,
        f.description,
        labels[f.category],
        f.authorName,
      ]}
      label={t.search.label}
      placeholder={t.search.placeholder}
      noResult={t.search.noResult}
    >
      {(visible) => <FilesTable files={visible} {...table} />}
    </SearchableList>
  );
}
