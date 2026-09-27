"use client";

import { useCallback, useRef } from "react";

/**
 * Drives an `AudioMeter` as a scrolling waveform, like Claude's dictation:
 * each new slice of voice enters on the right and the whole row slides left.
 * `push(level)` is called on each animation frame with the recorder's input
 * level (0 to 1) and writes the transforms directly, without a React render.
 */

/** Height of a bar in silence, as a share of the meter: a row of dots. */
export const AUDIO_METER_REST = 0.04;

/** One new bar every this many milliseconds: the scrolling speed. */
const SLICE_MS = 55;
/** Room noise stays a dot. */
const NOISE_GATE = 0.04;
/** Amplification of the voice, and the curve that lifts a quiet one. */
const GAIN = 1;
// Close to linear: only a loud voice reaches the top, a quiet one stays low.
const CURVE = 0.85;
/** No level for this long: a new recording, the waveform starts empty. */
const RESTART_MS = 800;

export function useAudioMeter() {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useRef({
    samples: [] as number[],
    peak: 0,
    sliceAt: 0,
    lastPush: 0,
    pitch: 0,
    row: null as HTMLSpanElement | null,
    reducedMotion: false,
  });

  const push = useCallback((raw: number) => {
    const row = ref.current;
    if (!row) return;
    const s = state.current;
    const now = performance.now();
    const bars = row.children;

    // New element or long gap: a fresh recording, measured once.
    if (row !== s.row || now - s.lastPush > RESTART_MS) {
      s.row = row;
      s.samples = new Array<number>(bars.length).fill(0);
      s.peak = 0;
      s.sliceAt = now;
      const [a, b] = [bars[0], bars[1]] as HTMLElement[];
      s.pitch = a && b ? b.offsetLeft - a.offsetLeft : 0;
      s.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
    }
    s.lastPush = now;

    // The loudest moment of the slice, on a perceptual curve (a quiet voice shows).
    const level = raw < NOISE_GATE ? 0 : Math.min(1, raw * GAIN) ** CURVE;
    s.peak = Math.max(s.peak, level);

    if (now - s.sliceAt >= SLICE_MS) {
      s.samples.shift();
      s.samples.push(s.peak);
      s.peak = 0;
      // Catch up after a slow frame without drifting.
      s.sliceAt = Math.max(s.sliceAt + SLICE_MS, now - SLICE_MS);
      for (let i = 0; i < bars.length; i++) {
        const height =
          AUDIO_METER_REST + (1 - AUDIO_METER_REST) * (s.samples[i] ?? 0);
        // `scale`, not `transform`: the resting class (Tailwind 4 `scale-y-*`)
        // sets `scale`, and the two would multiply.
        (bars[i] as HTMLElement).style.scale = `1 ${height}`;
      }
    }

    // Between two slices the row glides by one bar, so the newest one slides
    // in from the right edge. With reduced motion it steps instead.
    const progress = s.reducedMotion
      ? 1
      : Math.min(1, (now - s.sliceAt) / SLICE_MS);
    row.style.transform = `translateX(${(1 - progress) * s.pitch}px)`;
  }, []);

  return { ref, push };
}
