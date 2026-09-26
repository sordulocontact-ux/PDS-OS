import { cn } from "@/lib/utils";

// Count of things waiting (unread notifications, access requests): a small
// ink pill. Hidden from assistive technologies: the caller puts the number in
// the accessible name of the control that carries it.
export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-pill bg-foreground px-1 text-[10px] leading-none font-semibold text-background tabular-nums",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
