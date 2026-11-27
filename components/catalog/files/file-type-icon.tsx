import {
  IconBoxArchive,
  IconFile,
  IconFilm,
  IconImage,
  IconPresentationScreen,
  IconVolumeUp,
} from "nucleo-sharp-essential";

import { IconFileSheet } from "@/components/icons";
import { Thumbnail } from "@/components/ui/thumbnail";
import { isShownImage } from "@/lib/catalog/file-rules";
import { fileType, type FileType } from "@/lib/catalog/file-type";
import { fileTypeHue, hueIconClass } from "@/lib/ui/category-hues";
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

// `box`: the room it takes, a thumbnail's in a list, so the names line up
// whether a row shows a picture or an icon; `icon`: the bare icon in it.
const SIZES = {
  // A line of a list in a side sheet's fold.
  sm: { box: "size-6", icon: "size-4" },
  // A row of a table: the icon as large as DataTableIcon's (18 px), in the
  // thumbnails' width (Sacha, 27/11/2026: one icon size in every table).
  md: { box: "size-9", icon: "size-[18px]" },
  // A file the preview cannot draw: its icon, large.
  lg: { box: "size-20", icon: "size-12" },
} as const;

/**
 * Visual of a file: an image the browser shows is its own picture, small
 * (retour de Sacha du 05/11), any other file the icon of its type in its
 * hue (after Accordee, Sacha 24/11/2026): PDF red, spreadsheet green, text
 * blue, slides orange, then image, sound, video, archive, other. The icon
 * alone, without the disc around it (Sacha 25/11/2026).
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
      <Thumbnail src={previewUrl} icon={Icon} className={SIZES[size].box} />
    );
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZES[size].box,
        hueIconClass[fileTypeHue[type]],
      )}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
}
