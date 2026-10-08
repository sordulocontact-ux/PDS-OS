import { cn } from "@/lib/utils";

/**
 * « Prochaine action », at the top of a plan's panel (the prototype's): what
 * to do now, in blue; a decision of the direction, in violet; a wait for
 * someone else, in grey — then the controls that do it.
 */
export function NextCard({
  kind,
  label,
  title,
  children,
}: {
  kind: "act" | "decision" | "wait";
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        kind === "act" &&
          "border-[color:var(--selection)] bg-[color:var(--selection-bg)]",
        kind === "decision" &&
          "border-[color:var(--tone-action-fg)]/40 bg-[color:var(--tone-action-bg)]/50",
        kind === "wait" && "bg-muted",
      )}
    >
      <span
        className={cn(
          "text-caption font-semibold tracking-wide uppercase",
          kind === "act" && "text-[color:var(--selection)]",
          kind === "decision" && "text-[color:var(--tone-action-fg)]",
          kind === "wait" && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <h3 className="font-medium text-balance">{title}</h3>
      {children}
    </section>
  );
}
