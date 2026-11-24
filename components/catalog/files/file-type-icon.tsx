import {
  IconBoxArchive,
  IconFile,
  IconFilm,
  IconImage,
  IconPresentationScreen,
  IconVolumeUp,
} from "nucleo-sharp-essential";

import { IconFileSheet } from "@/components/icons";
import { DataTableIcon } from "@/components/ui/data-table";
import { Thumbnail } from "@/components/ui/thumbnail";
import { isShownImage } from "@/lib/catalog/file-rules";
import { fileType, type FileType } from "@/lib/catalog/file-type";
import { fileTypeHue, hueClass } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";

const ICONS: Record<FileType, React.ComponentType<{ className?: string }>> = {
  pdf: IconFile,
  sheet: IconFileSheet,
  text: IconFile,
  slides: IconPresentationScreen,
  image: IconImage,
  audio: IconVolumeUp,
  video: IconFilm,
  archive: IconBoxArchive,
  other: IconFile,
};

const SIZES = {
  // A line of a list in a side sheet's fold.
  sm: { disc: "size-6 [&>svg]:size-3.5" },
  // A row of a table (DataTableIcon's own disc).
  md: { disc: "" },
  // A file the preview cannot draw: its icon, large.
  lg: { disc: "size-20 [&>svg]:size-9" },
} as const;

/**
 * Visual of a file: an image the browser shows is its own picture, small
 * (retour de Sacha du 05/11), any other file the disc of its type in its
 * hue (after Accordee, Sacha 24/11/2026): PDF red, spreadsheet green, text
 * blue, slides orange, then image, sound, video, archive, other.
 */
export function FileTypeIcon({
  file,
  previewUrl = null,
  size = "md",
}: {
  file: { fileName: string; mime: string };
  // The picture to show; without it, the icon.
  previewUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  const type = fileType(file);
  const Icon = ICONS[type];
  if (previewUrl && isShownImage(file.mime))
    return (
      <Thumbnail src={previewUrl} icon={Icon} className={SIZES[size].disc} />
    );
  return (
    <DataTableIcon
      icon={Icon}
      className={cn(SIZES[size].disc, hueClass[fileTypeHue[type]])}
    />
  );
}
