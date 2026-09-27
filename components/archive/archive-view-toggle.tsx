import { FilterChipLink } from "@/components/ui/filter-chip";
import { fr } from "@/lib/i18n/fr";

// Live rows or the archive, on a list page (director only). The choice is
// in the URL (?view=archived): shareable, and the back button works.
export function ArchiveViewToggle({
  path,
  archived,
}: {
  path: string;
  archived: boolean;
}) {
  const t = fr.records.view;
  return (
    <nav aria-label={t.label} className="flex flex-wrap gap-1.5">
      <FilterChipLink href={path} current={!archived}>
        {t.live}
      </FilterChipLink>
      <FilterChipLink href={`${path}?view=archived`} current={archived}>
        {t.archived}
      </FilterChipLink>
    </nav>
  );
}
