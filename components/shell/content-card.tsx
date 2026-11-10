import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * A block of a page on its white card (proto « Projet complet », `.card`):
 * radius 12, hairline, 20 px of padding, 14 px between its parts, an
 * optional 18 px title it is labelled by. The overview's blocks, a locked
 * workflow, Travail, Validations, Activité. `quietTitle`: the title as a
 * small label, when what follows is the headline (the overview's
 * « Maintenant », whose action is the big line; retour d'Akili du 05/11).
 */
export function ContentCard({
  title,
  quietTitle = false,
  label,
  className,
  children,
}: {
  title?: string;
  quietTitle?: boolean;
  // Accessible name when the card has no visible title.
  label?: string;
  // Placement only.
  className?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={title ? id : undefined}
      aria-label={title ? undefined : label}
      className={cn(
        "flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5",
        className,
      )}
    >
      {title && (
        <h2
          id={id}
          className={
            quietTitle
              ? "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-secondary)]"
              : "text-[length:var(--type-body-lg)] leading-[var(--type-body-lg-lh)] font-medium tracking-[var(--type-display-tracking)]"
          }
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
