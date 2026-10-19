import { cn } from "@/lib/utils";

// Count of things waiting (unread notifications, access requests): a small
// ink pill. Hidden from assistive technologies: the caller puts the number in
// the accessible name of the control that carries it. `sm`: 16 px, on the
// corner of an icon (« Travail » in the collapsed navigation, proto).
export function CountBadge({
  count,
  size = "md",
  className,
}: {
  count: number;
  size?: "md" | "sm";
  // Placement only.
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-pill bg-foreground text-[length:var(--type-eyebrow)] leading-none font-semibold text-background tabular-nums",
        size === "sm" ? "h-4 min-w-4 px-1 font-bold" : "h-5 min-w-5 px-1",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
