import { IconExternalLink } from "@/components/icons";
import { catalog } from "@/lib/i18n/fr/catalog";
import { cn } from "@/lib/utils";

const fr = { catalog };

// Link to a Deezer (or Wikipedia) page, in a new tab. With `cover`, the
// link stretches over its nearest `relative` parent: the whole row or card
// is the target, only the title is announced.
export function ExternalLink({
  href,
  cover = false,
  icon = false,
  className,
  children,
}: {
  href: string;
  cover?: boolean;
  icon?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        cover && "after:absolute after:inset-0 after:rounded-[inherit]",
        icon && "inline-flex items-center gap-1.5",
        className,
      )}
    >
      {children}
      {icon && <IconExternalLink className="size-3.5 shrink-0" aria-hidden />}
      <span className="sr-only"> {fr.catalog.deezerProfile.newTab}</span>
    </a>
  );
}
