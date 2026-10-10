import {
  sheetFactGroups,
  type SheetValues,
} from "@/components/design/sheets/sheet-facts";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import type { SheetProvenance } from "@/lib/design/sheet-fields";
import { fr } from "@/lib/i18n/fr";

/**
 * A Fiche Livrable read as it stands (frozen while a version waits, or for
 * someone who does not write it): every value with where it comes from.
 */
export function SheetView({
  sheet,
  provenance,
}: {
  sheet: SheetValues;
  provenance: SheetProvenance;
}) {
  return (
    <>
      {sheetFactGroups(sheet, provenance).map((group) => (
        <PageSection
          key={group.id}
          id={`sheet-${group.id}`}
          title={group.title}
          card
        >
          <FactList facts={group.facts} emptyLabel={fr.conceptionSheet.none} />
        </PageSection>
      ))}
    </>
  );
}
