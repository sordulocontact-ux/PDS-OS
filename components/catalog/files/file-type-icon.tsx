import { IconFile, IconImage, IconVolumeUp } from "nucleo-sharp-essential";

import { DataTableIcon } from "@/components/ui/data-table";
import { fileKind } from "@/lib/catalog/file-rules";

const ICONS = {
  image: IconImage,
  audio: IconVolumeUp,
  document: IconFile,
} as const;

// Disc icon of a file by its type: image, sound, or any other document.
export function FileTypeIcon({
  file,
}: {
  file: { fileName: string; mime: string };
}) {
  return <DataTableIcon icon={ICONS[fileKind(file)]} />;
}
