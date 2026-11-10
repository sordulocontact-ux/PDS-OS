import { cva } from "class-variance-authority";

import { IconDisc } from "@/components/icons";
import { projectShell } from "@/lib/i18n/fr/project-shell";
import { cn } from "@/lib/utils";

const fr = { projectShell };

const frame = cva(
  "relative isolate shrink-0 overflow-hidden bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]",
  {
    variants: {
      size: {
        // The overview's head (proto « Vue d'ensemble », 10/11/2026; a step
        // smaller, Sacha 10/11/2026).
        lg: "size-16 rounded-lg sm:size-20 sm:rounded-xl",
        // A preview in a form.
        md: "size-16 rounded-lg",
      },
    },
    defaultVariants: { size: "lg" },
  },
);

/**
 * The project's cover (lib/projects/covers.ts): the image chosen for it or
 * its title's from the Catalogue, else a disc on grey — the empty cover of
 * the Catalogue's titles (ReleaseCover, the lists), never a coloured visual
 * (Sacha, 10/11/2026). `children`: what sits on it (the button that changes
 * it). Server-safe.
 */
export function ProjectCover({
  title,
  url,
  size,
  className,
  children,
}: {
  title: string;
  url: string | null;
  size?: "lg" | "md";
  className?: string;
  children?: React.ReactNode;
}) {
  const t = fr.projectShell.cover;
  return (
    <div className={cn(frame({ size }), className)}>
      {url ? (
        // A plain <img>: a signed URL of the private bucket.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={t.alt(title)} className="size-full object-cover" />
      ) : (
        <div
          role="img"
          aria-label={t.defaultAlt(title)}
          className="flex size-full items-center justify-center"
        >
          <IconDisc className={size === "md" ? "size-6" : "size-8"} />
        </div>
      )}
      {children}
    </div>
  );
}
