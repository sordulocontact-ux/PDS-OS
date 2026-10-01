import { IconFile } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { LibraryList } from "@/components/library/library-list";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  asLibrarySource,
  LIBRARY_LIMIT,
  LIBRARY_SOURCES,
  listLibraryFiles,
} from "@/lib/library/queries";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.library.title} · ${fr.app.name}` };

/**
 * Every file the viewer may read, in its latest version (MVP "bibliothèque
 * globale"): tabs by what it belongs to, an instant search. Adding, editing
 * and versioning stay in each library, one click away.
 */
export default async function FilesPage({
  searchParams,
}: PageProps<"/app/files">) {
  const [, library, params] = await allInOrder([
    requireApproved(),
    listLibraryFiles(),
    searchParams,
  ]);
  const t = fr.library;
  const view = asLibrarySource(params.view);
  const header = <PageHeader title={t.title} description={t.description} />;

  if (library.error)
    return (
      <PageContainer>
        {header}
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  const { files } = library;
  const shown = view ? files.filter((file) => file.source === view) : files;

  return (
    <PageContainer>
      {header}
      {files.length === 0 ? (
        <EmptyState icon={IconFile} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <DataTableViews
          label={t.viewsLabel}
          views={[
            {
              href: routes.files,
              label: t.views.all,
              count: files.length,
              current: view === null,
            },
            ...LIBRARY_SOURCES.map((source) => ({
              href: viewHref(routes.files, { view: source }),
              label: t.views[source],
              count: files.filter((file) => file.source === source).length,
              current: view === source,
            })),
          ]}
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={IconFile}
              title={t.emptyViewTitle(view ? t.views[view] : t.views.all)}
              body={t.emptyViewBody}
            />
          ) : (
            // Remounted per tab: the search starts empty on each one.
            <LibraryList key={view ?? "all"} files={shown} />
          )}
          {library.truncated && (
            <p className="text-sm text-muted-foreground">
              {t.truncated(LIBRARY_LIMIT)}
            </p>
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}
