import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import type { MasterRow } from "@/lib/catalog/types";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { masterPage };

// Variants block of the title overview: the other titles of its family (the
// original and the variants that name it, retour 08), in the table of the
// Catalogue, the original named as such. A new variant starts from this
// title's name and credits and is linked to the family's original.
export function VariantsSection({
  masterId,
  masters,
  error,
  rights,
}: {
  masterId: string;
  masters: MasterRow[];
  error: boolean;
  rights: RecordRights;
}) {
  const t = fr.masterPage.variants;
  return (
    <PageSection
      card
      id="variants"
      title={t.title}
      description={t.description}
      action={
        rights.canEdit && (
          <Link
            href={routes.mastersNewVariantOf(masterId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.add}
            </ButtonRoll>
          </Link>
        )
      }
    >
      {error ? (
        <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>
      ) : masters.length === 0 ? (
        <EmptyNote>
          {rights.canEdit ? t.emptyBody : t.emptyBodyReadOnly}
        </EmptyNote>
      ) : (
        <MastersTable masters={masters} rights={rights} family />
      )}
    </PageSection>
  );
}
