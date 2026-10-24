import { cn } from "@/lib/utils";

/**
 * A section of an open step (proto Juridique v3, docs/DESIGN.md § 4
 * « Sections d'une étape »): its title in ink, 18 px, above what it is
 * about; 8 px between the title and its content, 28 px before the section
 * (14 px of the step's gap plus its own margin). `aside`: a pill or a count
 * next to the title; `id` for an anchor.
 */
export function StepSection({
  title,
  aside,
  id,
  className,
  children,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "flex min-w-0 flex-col gap-2 [&:not(:first-child)]:mt-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[length:var(--type-body-lg)] leading-[var(--type-body-lg-lh)] font-semibold tracking-[var(--type-body-tracking)] text-balance text-foreground">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
