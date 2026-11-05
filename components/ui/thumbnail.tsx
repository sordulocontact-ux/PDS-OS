import { cn } from "@/lib/utils";

/**
 * A small square picture (a release's or a title's cover, an image file),
 * the icon on grey underneath: shown while it loads, without a picture, or
 * if the picture cannot be read (an empty `alt` draws nothing then).
 * Decorative: its name always sits next to it.
 */
export function Thumbnail({
  src,
  icon: Icon,
  className,
  iconClassName = "size-5",
}: {
  src: string | null;
  icon: React.ComponentType<{ className?: string }>;
  // Sets the size and radius (e.g. `size-9 rounded-lg`, `w-full`).
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]",
        className,
      )}
    >
      <Icon className={iconClassName} />
      {src && (
        // A plain <img>: signed or third-party URLs, a few small pictures,
        // no optimisation pipeline (next/image remotePatterns).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}
