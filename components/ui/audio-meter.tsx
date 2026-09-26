import { cva, type VariantProps } from "class-variance-authority";
import type { Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * Live input level as a row of bars that rise with the voice, taller in the
 * middle (in the spirit of Wispr Flow). Pure markup: the bars are moved by
 * `useAudioMeter`, from the recorder's animation frames, without re-rendering.
 */

export const AUDIO_METER_BARS = 21;

const audioMeterVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "h-5 gap-0.5",
      md: "h-8 gap-1",
    },
  },
  defaultVariants: { size: "md" },
});

const barVariants = cva(
  // Resting height matches AUDIO_METER_REST in use-audio-meter.ts.
  "h-full origin-center scale-y-[0.12] rounded-pill bg-[var(--meter-fill-over)] will-change-transform",
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
}: VariantProps<typeof audioMeterVariants> & {
  ref: Ref<HTMLSpanElement>;
  /** Tooltip naming what is measured (microphone, call sound). */
  label: string;
  className?: string;
}) {
  return (
    <span
      ref={ref}
      aria-hidden
      title={label}
      className={cn(audioMeterVariants({ size }), className)}
    >
      {Array.from({ length: AUDIO_METER_BARS }, (_, i) => (
        <span key={i} className={barVariants({ size })} />
      ))}
    </span>
  );
}
