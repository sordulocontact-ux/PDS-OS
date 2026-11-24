import { IconFile } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { LibraryList } from "@/components/library/library-list";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
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
import {
  filterParamsOf,
  filterValues,
  isFiltering,
  matchesAny,
  optionsOfNames,
} from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.library.title} · ${fr.app.name}` };

const FILE_KINDS = ["audio", "image", "document"] as const;

// Several values per axis: any of them.
type FileFilters = {
  category: string[];
  kind: string[];
  author: string[];
};

const matches = (file: LibraryFile, filters: FileFilters) =>
  matchesAny(filters.category, file.categoryLabel) &&
  matchesAny(filters.kind, fileKind(file)) &&
  matchesAny(filters.author, file.authorName);

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
    category: filterValues(params.category),
    kind: filterValues(params.kind),
    author: filterValues(params.author),
  };
  const filtering = isFiltering(filters);

  if (library.error)
    return (
      <SectionFrame title={t.title} description={t.description}>
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </SectionFrame>
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
    <SectionFrame title={t.title} description={t.description}>
      {files.length === 0 ? (
        <EmptyState icon={IconFile} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <DataTableViews
          label={t.viewsLabel}
          views={[
            {
              href: viewHref(routes.files, filterParamsOf(filters)),
              label: t.views.all,
              count: filtered.length,
              current: view === null,
            },
            ...LIBRARY_SOURCES.map((source) => ({
              href: viewHref(routes.files, {
                ...filterParamsOf(filters),
                view: source,
              }),
              label: t.views[source],
              count: filtered.filter((file) => file.source === source).length,
              current: view === source,
            })),
          ]}
        >
          <LibraryList
            files={shown}
            filters={
              <UrlFilters
                path={routes.files}
                params={{ view }}
                groups={filterGroups(ofView, filters)}
              />
            }
            empty={
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
            }
          />
          {library.truncated && (
            <p className="text-sm text-muted-foreground">
              {t.truncated(LIBRARY_LIMIT)}
            </p>
          )}
        </DataTableViews>
      )}
    </SectionFrame>
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
