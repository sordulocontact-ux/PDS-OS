import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/ui/state-tones";

const DOT: Record<Tone, string> = {
  neutral: "bg-[color:var(--po-grey-300)]",
  info: "bg-[color:var(--tone-info-fg)]",
  warning: "bg-[color:var(--tone-warning-fg)]",
  success: "bg-[color:var(--tone-success-fg)]",
  danger: "bg-[color:var(--tone-danger-fg)]",
  action: "bg-[color:var(--tone-action-fg)]",
};

/**
 * A state as a small dot (a workflow in the project's sidebar or on its
 * card): the colour only reinforces `label`, said to screen readers and in
 * the tooltip, or written next to it with `showLabel`.
 */
export function StatusDot({
  tone,
  label,
  showLabel = false,
  className,
}: {
  tone: Tone;
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={showLabel ? undefined : label}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[tone])} />
      <span className={showLabel ? "text-caption" : "sr-only"}>{label}</span>
    </span>
  );
}
