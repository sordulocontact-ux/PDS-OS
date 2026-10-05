import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import type { RecordRights } from "@/lib/archive/types";
import { routes } from "@/lib/auth/redirects";
import type { MasterRow } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Variants block of the title overview: the other titles of the same name
// for the same artists, in the table of the Titres page. A new variant starts
// from this title's name and credits.
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
            <IconPlus aria-hidden data-icon="inline-start" />
            {t.add}
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
        <MastersTable masters={masters} rights={rights} />
      )}
    </PageSection>
  );
}
