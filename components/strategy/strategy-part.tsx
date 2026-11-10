import { cn } from "@/lib/utils";

/**
 * A part under a section of the Stratégie, its one intertitle: inside a
 * dimension (the positioning's parts, a lever's deliverables, the budget
 * lines, the upstream deadlines, PO's proposals and the levers) and inside
 * a generator's screen (« Déjà connu », « Liens d'écoute »…). Its title in
 * ink, 16 px semibold — under the 18 px of a `StepSection` and never above
 * the dimension's own name —, `aside` (gestures) on the right, `description`
 * one sentence held under it, then its content.
 */
export function StrategyPart({
  title,
  aside,
  description,
  id,
  className,
  children,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  description?: React.ReactNode;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h4
            id={id}
            className="min-w-0 flex-1 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold break-words text-foreground"
          >
            {title}
          </h4>
          {aside}
        </div>
        {description && (
          <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
