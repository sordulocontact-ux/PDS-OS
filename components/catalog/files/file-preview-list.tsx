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

// Opens the preview on a file; `only`: ← → go through these files alone
// (the ticked ones, FileSelection), in the table's order.
type ShowPreview = (id: string, only?: string[]) => void;

const PreviewContext = createContext<ShowPreview | null>(null);

/** Opens the preview of the files list around (FilePreviewList). */
export function useFilePreview(): ShowPreview | null {
  return useContext(PreviewContext);
}

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
  const [only, setOnly] = useState<string[] | null>(null);
  const sorted = useMemo(
    () =>
      order
        ? order.flatMap((index) => (files[index] ? [files[index]] : []))
        : files,
    [order, files],
  );
  const shown = useMemo(
    () => (only ? sorted.filter((file) => only.includes(file.id)) : sorted),
    [sorted, only],
  );
  // The file shown stays while the preview closes, so it leaves drawn.
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const show: ShowPreview = (id, subset) => {
    setOnly(subset ?? null);
    // A selection opens on its first file as the table shows them.
    setCurrent(
      subset ? (sorted.find((file) => subset.includes(file.id))?.id ?? id) : id,
    );
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
 * hover (Sacha 29/10, OverflowHintArea of the table).
 */
export function FilePreviewLink({
  file,
}: {
  file: { id: string; fileName: string; openUrl: string | null };
}) {
  const show = useContext(PreviewContext);
  const t = fr.catalogFiles;
  const name = (
    <span aria-hidden className="block max-w-80 truncate">
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
