import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasterVariantIds } from "@/lib/catalog/master/related";
import { getMaster, listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Variants: the other titles of the same name for the same artists, in the
// table of the Titres page. A new variant starts from this title's name and
// credits.
export default async function MasterVariantsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/variants">) {
  const { masterId } = await params;
  const [access, master] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
  ]);
  if (!master) notFound();
  const found = await listMasterVariantIds(master);
  const { masters, error } = found.error
    ? { masters: [], error: true }
    : await listMasters({ ids: found.ids });
  const t = fr.masterPage.variants;
  const canEdit = can(access, "manage_catalog");
  const add = canEdit ? (
    <Link
      href={routes.mastersNewVariantOf(master.id)}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.add}
    </Link>
  ) : null;

  if (error)
    return <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>;
  if (masters.length === 0) {
    return (
      <EmptyState
        icon={IconDisc}
        title={t.emptyTitle}
        body={canEdit ? t.emptyBody : t.emptyBodyReadOnly}
        action={add}
      />
    );
  }
  return (
    <PageSection
      id="variants"
      title={t.title}
      description={t.description}
      action={add}
    >
      <MastersTable
        masters={masters}
        rights={{
          canEdit,
          canArchive: can(access, "archive_records"),
          archived: false,
        }}
      />
    </PageSection>
  );
}
