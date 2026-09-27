import { IconBoxArchive, IconPlus } from "nucleo-sharp-essential";
import { IconDisc } from "@/components/icons";
import Link from "next/link";

import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { FormMessage } from "@/components/auth/form-message";
import { MastersList } from "@/components/catalog/masters-list";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasters } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

export default async function MastersPage({
  searchParams,
}: PageProps<"/app/catalog/masters">) {
  const access = await requireApproved();
  const t = fr.catalog.masters;
  const canArchive = can(access, "archive_records");
  // The archive is the director's: anyone else always sees live masters.
  const archived = canArchive && isArchivedView((await searchParams).view);
  const { masters, error } = await listMasters({ archived });
  const newMaster =
    can(access, "manage_catalog") && !archived ? (
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
      {canArchive && (
        <ArchiveViewToggle path={routes.masters} archived={archived} />
      )}
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : masters.length === 0 ? (
        archived ? (
          <EmptyState
            icon={IconBoxArchive}
            title={fr.records.archivedEmpty.master}
            body={fr.records.archivedEmptyBody}
          />
        ) : (
          <EmptyState
            icon={IconDisc}
            title={t.emptyTitle}
            body={newMaster ? t.emptyBody : t.emptyBodyReadOnly}
            action={newMaster}
          />
        )
      ) : (
        // The design leaves a wider gap between the header and the list.
        <div className={canArchive ? undefined : "md:mt-10"}>
          <MastersList
            masters={masters}
            rights={{
              canEdit: can(access, "manage_catalog"),
              canArchive,
              archived,
            }}
          />
        </div>
      )}
    </PageContainer>
  );
}
