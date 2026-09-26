import { IconPlus } from "nucleo-sharp-essential";
import { IconDisc } from "@/components/icons";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { MastersTable } from "@/components/catalog/masters-table";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

export default async function MastersPage() {
  const access = await requireApproved();
  const t = fr.catalog.masters;
  const { masters, error } = await listMasters();
  const newMaster = can(access, "manage_catalog") ? (
    <Link href={routes.mastersNew} className={buttonVariants({ size: "lg" })}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.newMaster}
    </Link>
  ) : null;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={masters.length > 0 ? newMaster : null}
      />
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : masters.length === 0 ? (
        <EmptyState
          icon={IconDisc}
          title={t.emptyTitle}
          body={newMaster ? t.emptyBody : t.emptyBodyReadOnly}
          action={newMaster}
        />
      ) : (
        <MastersTable masters={masters} />
      )}
    </PageContainer>
  );
}
