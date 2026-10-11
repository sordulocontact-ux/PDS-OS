"use client";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { Checkbox } from "@/components/ui/checkbox";
import type { SimilarImage } from "@/lib/design/similar-rules";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * One image a source found: the whole picture ticks it (a native checkbox
 * in the label); below, its title, who made or saved it (and its licence on
 * Openverse), and its page at the source.
 */
export function SimilarImageTile({
  image,
  checked,
  disabled,
  onCheckedChange,
}: {
  image: SimilarImage;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const t = fr.conceptionRefs.similar;
  const title = image.title ?? t.untitled;
  const credit = t.credit(image.author, image.license);
  return (
    <article className="flex flex-col gap-1.5">
      <label
        className={cn(
          "relative block cursor-pointer overflow-hidden rounded-xl bg-muted outline-2 -outline-offset-2 transition-[outline-color] duration-150 ease-out",
          checked ? "outline-selection" : "outline-transparent",
          disabled && "cursor-not-allowed",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the source's own thumbnail, shown only while choosing */}
        <img
          src={image.thumbnail}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-square size-full object-cover"
        />
        <Checkbox
          size="md"
          checked={checked}
          disabled={disabled}
          aria-label={t.pick(title)}
          onChange={(e) => onCheckedChange(e.currentTarget.checked)}
          className="absolute top-2 left-2"
        />
      </label>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium" title={title}>
          {title}
        </span>
        {credit && (
          <span
            className="truncate text-caption text-muted-foreground"
            title={credit}
          >
            {credit}
          </span>
        )}
        <ExternalLink
          href={image.pageUrl}
          icon
          className="w-fit text-caption text-muted-foreground underline-offset-2 hover:underline"
        >
          {t.onSource(t.sources[image.source])}
        </ExternalLink>
      </div>
    </article>
  );
}
