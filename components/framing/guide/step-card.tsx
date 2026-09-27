import { cn } from "@/lib/utils";

/**
 * One screen of the Framing's guided review (docs/DESIGN.md § 4, « Sélection
 * et formulaires en étapes »): the question as title, the content, then the
 * actions at the bottom right, main one last. No card around it: only the
 * clickable options inside have an outline.
 */
export function FramingStepCard({
  title,
  description,
  actions,
  actionsAlign = "end",
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** "start" when there is no content to close: the buttons follow the title. */
  actionsAlign?: "start" | "end";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="framing-step-title"
      className={cn("flex min-w-0 flex-col gap-8", className)}
    >
      <header className="flex flex-col gap-2">
        <h2
          id="framing-step-title"
          className="text-display-md font-semibold break-words text-foreground"
        >
          {title}
        </h2>
        {description && (
          <div className="text-body-md text-muted-foreground">
            {description}
          </div>
        )}
      </header>
      {children}
      {actions && (
        <div
          className={cn(
            "flex flex-col-reverse gap-2 sm:flex-wrap sm:justify-end",
            // At the start, the main button (last) comes first, left.
            actionsAlign === "end" ? "sm:flex-row" : "sm:flex-row-reverse",
          )}
        >
          {actions}
        </div>
      )}
    </section>
  );
}
