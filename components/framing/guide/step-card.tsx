import { cn } from "@/lib/utils";

/**
 * One screen of the Framing's guided review: a surtitle saying where the
 * content comes from, the question or answer as title, then the content and
 * its actions (the first one is the main action).
 */
export function FramingStepCard({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="framing-step-title"
      className={cn(
        "flex min-w-0 flex-col gap-6 rounded-3xl border border-border bg-background p-5 md:p-8",
        className,
      )}
    >
      <header className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground">{eyebrow}</p>
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
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
