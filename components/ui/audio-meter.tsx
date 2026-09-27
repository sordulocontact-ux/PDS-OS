import { cva, type VariantProps } from "class-variance-authority";
import type { Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * Live input level as a scrolling waveform (like Claude's dictation): the
 * newest slice of voice enters on the right, older ones slide off to the left,
 * fading out. Pure markup: `useAudioMeter` moves it from the recorder's
 * animation frames, without re-rendering.
 */

// Enough bars to fill a wide input; the ones past the left edge are clipped.
const BARS = 240;

const rowVariants = cva("flex shrink-0 items-center will-change-transform", {
  variants: {
    size: {
      sm: "h-15 gap-0.5",
      md: "h-10 gap-1",
    },
  },
  defaultVariants: { size: "md" },
});

const barVariants = cva(
  // Resting height matches AUDIO_METER_REST in use-audio-meter.ts.
  "h-full shrink-0 origin-center scale-y-[0.04] rounded-pill bg-[var(--meter-fill-over)]",
  {
    variants: {
      size: {
        sm: "w-0.5",
        md: "w-1",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export function AudioMeter({
  ref,
  label,
  size,
  className,
}: VariantProps<typeof rowVariants> & {
  /** The moving row, handed to `useAudioMeter`. */
  ref: Ref<HTMLSpanElement>;
  /** Tooltip naming what is measured (microphone, call sound). */
  label: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={label}
      // Anchored right: the row overflows to the left, where it fades out.
      className={cn(
        "flex min-w-0 justify-end overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%)]",
        className,
      )}
    >
      <span ref={ref} className={rowVariants({ size })}>
        {Array.from({ length: BARS }, (_, i) => (
          <span key={i} className={barVariants({ size })} />
        ))}
      </span>
    </span>
  );
}
