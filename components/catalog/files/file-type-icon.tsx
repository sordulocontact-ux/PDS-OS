import { IconFile, IconImage, IconVolumeUp } from "nucleo-sharp-essential";

import { DataTableIcon } from "@/components/ui/data-table";
import { Thumbnail } from "@/components/ui/thumbnail";
import { fileKind, isShownImage } from "@/lib/catalog/file-rules";

const ICONS = {
  image: IconImage,
  audio: IconVolumeUp,
  document: IconFile,
} as const;

/**
 * Visual of a file: an image the browser shows is its own picture, small
 * (retour de Sacha du 05/11), any other file the disc of its type (image,
 * sound, document).
 */
export function FileTypeIcon({
  file,
  previewUrl = null,
}: {
  file: { fileName: string; mime: string };
  // The picture to show; without it, the icon.
  previewUrl?: string | null;
}) {
  if (previewUrl && isShownImage(file.mime))
    return <Thumbnail src={previewUrl} icon={IconImage} className="size-9" />;
  return <DataTableIcon icon={ICONS[fileKind(file)]} />;
}
