import { IconEyeOpen } from "nucleo-sharp-essential";

import { IconDownload } from "@/components/icons";
import type { RowAction } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";

/**
 * The first entries of a file's "⋯": open it in a new tab (the browser
 * previews PDFs, images, sounds), download it under its name. Only the ones
 * its signed URLs allow.
 */
export function fileOpenActions(file: {
  openUrl: string | null;
  downloadUrl: string | null;
}): RowAction[] {
  const t = fr.catalogFiles.menu;
  const { openUrl, downloadUrl } = file;
  return [
    ...(openUrl
      ? [
          {
            key: "open",
            label: t.open,
            icon: IconEyeOpen,
            onSelect: () => window.open(openUrl, "_blank", "noopener"),
          },
        ]
      : []),
    ...(downloadUrl
      ? [
          {
            key: "download",
            label: t.download,
            icon: IconDownload,
            // Served as an attachment: the page stays.
            onSelect: () => window.location.assign(downloadUrl),
          },
        ]
      : []),
  ];
}
