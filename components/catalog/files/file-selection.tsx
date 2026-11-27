"use client";

import { IconEyeOpen } from "nucleo-sharp-essential";

import { useFilePreview } from "@/components/catalog/files/file-preview-list";
import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RowSelection, useRowSelection } from "@/components/ui/row-selection";
import { SelectionBar } from "@/components/ui/selection-bar";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";

const fr = { catalogFiles };

type SelectableFile = { id: string; downloadUrl: string | null };

/**
 * Several files ticked in a table of files (Sacha 25/11/2026), inside its
 * FilePreviewList: « Ouvrir » shows them large one after the other (← →
 * through the ticked ones only: a page may open one new tab per click, the
 * browser blocks the others), « Télécharger » saves each one under its name.
 */
export function FileSelection({
  files,
  children,
}: {
  files: SelectableFile[];
  children: React.ReactNode;
}) {
  return (
    <RowSelection>
      {children}
      <FileSelectionBar files={files} />
    </RowSelection>
  );
}

function FileSelectionBar({ files }: { files: SelectableFile[] }) {
  const t = fr.catalogFiles.selection;
  const { selected } = useRowSelection();
  const show = useFilePreview();
  const ids = selected.map((row) => row.id);
  const urls = files.flatMap((file) =>
    ids.includes(file.id) && file.downloadUrl ? [file.downloadUrl] : [],
  );

  return (
    <SelectionBar>
      {show && ids.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => show(ids[0], ids)}
        >
          <IconEyeOpen aria-hidden data-icon="inline-start" />
          {t.open}
        </Button>
      )}
      {urls.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => downloadAll(urls)}
        >
          <IconDownload aria-hidden data-icon="inline-start" />
          {t.download}
        </Button>
      )}
    </SelectionBar>
  );
}

// Each file in a hidden frame: its signed URL is served as an attachment,
// so the page stays and every file is saved (a link followed in a loop
// keeps only the last). The browser may ask once to allow several
// downloads. The frames go once the downloads have started.
function downloadAll(urls: string[]) {
  for (const url of urls) {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.src = url;
    document.body.append(frame);
    window.setTimeout(() => frame.remove(), 60_000);
  }
}
