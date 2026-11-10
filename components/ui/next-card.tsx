import { cn } from "@/lib/utils";

export type NextCardKind = "act" | "decision" | "wait" | "done";

/**
 * « Prochaine action » (the Juridique's plan, the Production's sheet): what
 * to do now, in blue; a decision, in violet; a wait for someone else, in
 * grey; a finished workflow, in green — then the controls that do it.
 */
export function NextCard({
  kind,
  label,
  title,
  children,
}: {
  kind: NextCardKind;
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 bg-card",
        kind === "act" &&
          "border-[color:var(--selection)] bg-[color:var(--selection-bg)]",
        kind === "decision" &&
          "border-[color:var(--tone-action-fg)]/40 bg-[color:var(--tone-action-bg)]/50",
        kind === "wait" && "bg-muted",
        kind === "done" &&
          "border-[color:var(--tone-success-fg)]/30 bg-[color:var(--tone-success-bg)]/50",
      )}
    >
      <span
        className={cn(
          "text-caption font-semibold tracking-wide uppercase",
          kind === "act" && "text-[color:var(--selection)]",
          kind === "decision" && "text-[color:var(--tone-action-fg)]",
          kind === "wait" && "text-muted-foreground",
          kind === "done" && "text-[color:var(--tone-success-fg)]",
        )}
      >
        {label}
      </span>
      <h3 className="font-medium text-balance">{title}</h3>
      {children}
    </section>
  );
}
