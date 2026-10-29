import { IconFile } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { LibraryList } from "@/components/library/library-list";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileKind } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import {
  asLibrarySource,
  LIBRARY_LIMIT,
  LIBRARY_SOURCES,
  listLibraryFiles,
  type LibraryFile,
} from "@/lib/library/queries";
import { filterParam, optionsOfNames } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.library.title} · ${fr.app.name}` };

const FILE_KINDS = ["audio", "image", "document"] as const;

type FileFilters = {
  category: string | null;
  kind: string | null;
  author: string | null;
};

const matches = (file: LibraryFile, filters: FileFilters) =>
  (!filters.category || file.categoryLabel === filters.category) &&
  (!filters.kind || fileKind(file) === filters.kind) &&
  (!filters.author || file.authorName === filters.author);

/**
 * Every file the viewer may read, in its latest version (MVP "bibliothèque
 * globale"): tabs by what it belongs to, « Filtres » by category, type and
 * author, an instant search. Adding, editing and versioning stay in each
 * library, one click away.
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
  const filters: FileFilters = {
    category: filterParam(params.category),
    kind: filterParam(params.kind),
    author: filterParam(params.author),
  };
  const filtering = Object.values(filters).some((value) => value !== null);
  const header = <PageHeader title={t.title} description={t.description} />;

  if (library.error)
    return (
      <PageContainer>
        {header}
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  const { files } = library;
  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = files.filter((file) => matches(file, filters));
  const ofView = view ? files.filter((file) => file.source === view) : files;
  const shown = view
    ? filtered.filter((file) => file.source === view)
    : filtered;

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
              href: viewHref(routes.files, filters),
              label: t.views.all,
              count: filtered.length,
              current: view === null,
            },
            ...LIBRARY_SOURCES.map((source) => ({
              href: viewHref(routes.files, { ...filters, view: source }),
              label: t.views[source],
              count: filtered.filter((file) => file.source === source).length,
              current: view === source,
            })),
          ]}
          action={
            <UrlFilters
              path={routes.files}
              params={{ view }}
              groups={filterGroups(ofView, filters)}
            />
          }
        >
          {shown.length === 0 ? (
            filtering ? (
              <EmptyState
                icon={IconFile}
                title={t.filtersEmpty}
                body={t.filtersEmptyBody}
              />
            ) : (
              <EmptyState
                icon={IconFile}
                title={t.emptyViewTitle(view ? t.views[view] : t.views.all)}
                body={t.emptyViewBody}
              />
            )
          ) : (
            // Remounted per view: the search starts empty on each one.
            <LibraryList
              key={[view, ...Object.values(filters)].join("-")}
              files={shown}
            />
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

// Only what some file of the tab holds.
function filterGroups(
  files: LibraryFile[],
  current: FileFilters,
): UrlFilterGroup[] {
  const t = fr.library.filters;
  return [
    {
      key: "category",
      label: t.categoryLabel,
      allLabel: t.categoryAll,
      options: optionsOfNames(files.map((file) => file.categoryLabel)),
      current: current.category,
    },
    {
      key: "kind",
      label: t.kindLabel,
      allLabel: t.kindAll,
      options: FILE_KINDS.filter((kind) =>
        files.some((file) => fileKind(file) === kind),
      ).map((kind) => ({ value: kind, label: t.kinds[kind] })),
      current: current.kind,
    },
    {
      key: "author",
      label: t.authorLabel,
      allLabel: t.authorAll,
      options: optionsOfNames(files.map((file) => file.authorName)),
      current: current.author,
    },
  ];
}
