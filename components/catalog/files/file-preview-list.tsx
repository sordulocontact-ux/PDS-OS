"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useMemo, useState } from "react";

import { DataTableLink } from "@/components/ui/data-table";
import { TableSortProvider, useShownOrder } from "@/components/ui/table-sort";
import type { PreviewFile } from "@/lib/catalog/file-type";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

// Heavy and opened now and then: loaded on the first hover of a file's name.
const FilePreview = dynamic(
  () =>
    import("@/components/catalog/files/file-preview").then(
      (m) => m.FilePreview,
    ),
  { ssr: false },
);
const preload = () => void import("@/components/catalog/files/file-preview");

const PreviewContext = createContext<((id: string) => void) | null>(null);

/**
 * Around a table of files: a click on a file's name opens it large over
 * the list (FilePreview), ← → then go through the files in the order the
 * table shows them (its sort included).
 */
export function FilePreviewList({
  files,
  children,
}: {
  // The table's rows, in its order.
  files: PreviewFile[];
  children: React.ReactNode;
}) {
  return (
    <TableSortProvider scope>
      <PreviewState files={files}>{children}</PreviewState>
    </TableSortProvider>
  );
}

function PreviewState({
  files,
  children,
}: {
  files: PreviewFile[];
  children: React.ReactNode;
}) {
  const order = useShownOrder();
  const shown = useMemo(
    () =>
      order
        ? order.flatMap((index) => (files[index] ? [files[index]] : []))
        : files,
    [order, files],
  );
  // The file shown stays while the preview closes, so it leaves drawn.
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const show = (id: string) => {
    setCurrent(id);
    setOpen(true);
  };

  return (
    <PreviewContext value={show}>
      {children}
      {current !== null && (
        <FilePreview
          files={shown}
          currentId={current}
          open={open}
          onCurrentChange={setCurrent}
          onClose={() => setOpen(false)}
        />
      )}
    </PreviewContext>
  );
}

/**
 * A file's name in its row: inside a `FilePreviewList` it opens the
 * preview, elsewhere the file in a new tab. A long name is cut, whole on
 * hover (Sacha 29/10).
 */
export function FilePreviewLink({
  file,
}: {
  file: { id: string; fileName: string; openUrl: string | null };
}) {
  const show = useContext(PreviewContext);
  const t = fr.catalogFiles;
  const name = (
    <span aria-hidden title={file.fileName} className="block max-w-80 truncate">
      {file.fileName}
    </span>
  );
  if (!show || !file.openUrl)
    return (
      <DataTableLink href={file.openUrl} newTab>
        <span className="sr-only">{t.open(file.fileName)}</span>
        {name}
      </DataTableLink>
    );
  return (
    <span className="contents" onPointerEnter={preload} onFocus={preload}>
      <DataTableLink href={null} onOpen={() => show(file.id)}>
        <span className="sr-only">{t.preview.show(file.fileName)}</span>
        {name}
      </DataTableLink>
    </span>
  );
}
