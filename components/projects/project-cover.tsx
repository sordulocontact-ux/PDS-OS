import { cva } from "class-variance-authority";

import { projectShell } from "@/lib/i18n/fr/project-shell";
import { coverHueOf } from "@/lib/projects/cover-rules";
import { cn } from "@/lib/utils";

const fr = { projectShell };

const frame = cva(
  "relative isolate shrink-0 overflow-hidden bg-[var(--surface-soft)] shadow-[inset_0_0_0_1px_var(--border-hairline)]",
  {
    variants: {
      size: {
        // The overview's head (proto « Vue d'ensemble », 10/11/2026).
        lg: "size-20 rounded-xl sm:size-26 sm:rounded-2xl",
        // A preview in a form.
        md: "size-16 rounded-lg",
        // A row of the projects' list.
        sm: "size-9 rounded-md",
      },
    },
    defaultVariants: { size: "lg" },
  },
);

/**
 * The project's cover (lib/projects/covers.ts): the image chosen for it or
 * its title's from the Catalogue, else a default visual — a hue drawn from
 * its id under the rings of a disc (`.project-cover-default`), the same
 * everywhere the project shows. `children`: what sits on it (the button
 * that changes it). Server-safe.
 */
export function ProjectCover({
  id,
  title,
  url,
  size,
  className,
  children,
}: {
  id: string;
  title: string;
  url: string | null;
  size?: "lg" | "md" | "sm";
  className?: string;
  children?: React.ReactNode;
}) {
  const t = fr.projectShell.cover;
  return (
    <div className={cn(frame({ size }), className)}>
      {url ? (
        // A plain <img>: a signed URL of the private bucket, already sized
        // (the Catalogue's small copy in a list).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={size === "sm" ? "" : t.alt(title)}
          className="size-full object-cover"
          loading={size === "sm" ? "lazy" : undefined}
        />
      ) : (
        <div
          role={size === "sm" ? undefined : "img"}
          aria-label={size === "sm" ? undefined : t.defaultAlt(title)}
          data-hue={coverHueOf(id)}
          className="project-cover-default size-full"
        >
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            aria-hidden
            className="size-full"
          >
            <circle cx="78" cy="82" r="20" />
            <circle cx="78" cy="82" r="34" />
            <circle cx="78" cy="82" r="48" />
            <circle cx="78" cy="82" r="62" />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
}
