import { IconFile } from "nucleo-sharp-essential";

import {
  FileDropArea,
  FileImport,
  FileImportButton,
  FileImportEmpty,
} from "@/components/catalog/files/file-import";
import { FilesTable } from "@/components/catalog/files/files-table";
import { EmptyState } from "@/components/shell/empty-state";
import { DataTableViews } from "@/components/ui/data-table";
import {
  fileViewsOf,
  type CatalogFile,
  type FileOwner,
  type FileView,
  type FileWriteScope,
} from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

/**
 * Files tab of an artist, a title, a project or a contract (feedback n°6): one library, and views
 * that filter it (Tous, then one per category, counts by the code). `files`
 * are those the viewer may read (RLS): Tous never shows a contract a viewer
 * could not open, and without that right the Contracts view is not offered.
 * `organizationId` (manage_catalog) makes the list an import zone.
 * `scope`: a writer limited to some categories and to her own files (the
 * creative team in a project's library).
 */
export function FileLibrary({
  owner,
  organizationId,
  canReadContracts,
  files,
  view,
  basePath,
  emptyBody,
  emptyBodyReadOnly,
  scope,
}: {
  owner: FileOwner;
  organizationId: string | null;
  canReadContracts: boolean;
  files: CatalogFile[];
  view: FileView;
  basePath: string;
  emptyBody: string;
  emptyBodyReadOnly: string;
  scope?: FileWriteScope | null;
}) {
  const t = fr.catalogFiles;
  const labels: Record<string, string> = t.views[owner.kind];
  const canEdit = organizationId !== null;
  const inView = (category: FileView) =>
    category === "all"
      ? files
      : files.filter((file) => file.category === category);
  const visible = inView(view);

  const title = view === "all" ? t.emptyTitle : t.emptyViewTitle(labels[view]);
  const body =
    view === "all"
      ? canEdit
        ? emptyBody
        : emptyBodyReadOnly
      : canEdit
        ? t.emptyViewBody
        : t.emptyViewBodyReadOnly;

  const library = (
    <DataTableViews
      label={t.viewsLabel}
      views={fileViewsOf(owner.kind, canReadContracts).map((category) => ({
        href: viewHref(basePath, {
          category: category === "all" ? null : category,
        }),
        label: labels[category],
        count: inView(category).length,
        current: category === view,
      }))}
      action={canEdit && <FileImportButton />}
    >
      {canEdit ? (
        <FileDropArea>
          {visible.length > 0 ? (
            <FilesTable
              owner={owner}
              files={visible}
              canEdit
              organizationId={organizationId}
              scope={scope}
            />
          ) : (
            <FileImportEmpty title={title} body={body} />
          )}
        </FileDropArea>
      ) : visible.length > 0 ? (
        <FilesTable owner={owner} files={visible} canEdit={false} />
      ) : (
        <EmptyState icon={IconFile} title={title} body={body} />
      )}
    </DataTableViews>
  );

  if (!organizationId) return library;
  return (
    <FileImport
      organizationId={organizationId}
      owner={owner}
      view={view}
      basePath={basePath}
      categories={scope?.categories}
    >
      {library}
    </FileImport>
  );
}
