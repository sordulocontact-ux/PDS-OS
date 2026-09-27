import { IconBoxArchive, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { MastersList } from "@/components/catalog/masters-list";
import { TitleListViews } from "@/components/catalog/title/title-list-views";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasters } from "@/lib/catalog/queries";
import {
  countTitleViews,
  inTitleView,
  titleViewOf,
} from "@/lib/catalog/title-views";
import { fr } from "@/lib/i18n/fr";

// Titres ("masters" in the code): tabs by audio state, the demos left out
// by default (docs/ARCHITECTURE.md § 2 septies).
export default async function MastersPage({
  searchParams,
}: PageProps<"/app/catalog/masters">) {
  const access = await requireApproved();
  const t = fr.catalog.masters;
  const canArchive = can(access, "archive_records");
  const params = await searchParams;
  // The archive is the director's: anyone else always sees live titles.
  const archived = canArchive && isArchivedView(params.view);
  const view = titleViewOf(params.state);
  // One read for the tab counts and the rows: the catalog stays small.
  const { masters: all, error } = await listMasters({ archived });
  const masters = all.filter((master) => inTitleView(master, view));
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
        action={all.length > 0 ? newMaster : null}
      />
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <TitleListViews
          view={view}
          counts={countTitleViews(all)}
          archived={archived}
          canArchive={canArchive}
        >
          {masters.length === 0 ? (
            archived ? (
              <EmptyState
                icon={IconBoxArchive}
                title={fr.records.archivedEmpty.master}
                body={fr.records.archivedEmptyBody}
              />
            ) : all.length > 0 && view !== "all" ? (
              <EmptyState
                icon={IconDisc}
                title={t.filteredEmpty[view]}
                body={t.filteredEmptyBody}
                action={newMaster}
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
            <MastersList
              masters={masters}
              rights={{
                canEdit: can(access, "manage_catalog"),
                canArchive,
                archived,
              }}
            />
          )}
        </TitleListViews>
      )}
    </PageContainer>
  );
}
