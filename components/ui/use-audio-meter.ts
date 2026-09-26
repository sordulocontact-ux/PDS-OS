"use client";

import { useCallback, useRef } from "react";

/**
 * Drives an `AudioMeter`: `push(level)` is called on each animation frame with
 * the recorder's input level (0 to 1) and writes the bars' transforms directly,
 * without a React render.
 */

/** Height of a bar in silence, as a share of the meter: a row of dots. */
export const AUDIO_METER_REST = 0.12;

// Fast attack, slower release: the bars jump with a syllable and settle gently.
const ATTACK = 0.6;
const RELEASE = 0.15;

export function useAudioMeter() {
  const ref = useRef<HTMLSpanElement>(null);
  const smoothed = useRef(0);
  const reducedMotion = useRef<boolean | null>(null);

  const push = useCallback((raw: number) => {
    const meter = ref.current;
    if (!meter) return;
    reducedMotion.current ??= window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Perceptual curve: a quiet voice still lifts the bars visibly.
    const target = Math.min(1, Math.max(0, raw)) ** 0.6;
    const previous = smoothed.current;
    // Exactly zero means stopped or paused: rest at once.
    const level =
      raw === 0
        ? 0
        : previous + (target - previous) * (target > previous ? ATTACK : RELEASE);
    smoothed.current = level;

    const time = performance.now() / 1000;
    const bars = meter.children;
    const last = Math.max(1, bars.length - 1);
    for (let i = 0; i < bars.length; i++) {
      const x = (i / last) * 2 - 1;
      // Taller in the middle, lower at the edges.
      const envelope = 1 - 0.7 * x * x;
      // Each bar breathes at its own pace, so the row reads as a voice, not a gauge.
      // Dropped when the user asks for less motion: the height alone follows the level.
      const wobble = reducedMotion.current
        ? 1
        : 0.7 + 0.3 * Math.sin(time * 9 + i * 1.7) * Math.sin(time * 5.3 + i);
      const height =
        AUDIO_METER_REST + (1 - AUDIO_METER_REST) * level * envelope * wobble;
      (bars[i] as HTMLElement).style.transform = `scaleY(${height})`;
    }
  }, []);

  return { ref, push };
}
