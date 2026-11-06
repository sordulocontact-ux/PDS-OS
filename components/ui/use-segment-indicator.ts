"use client";

import { useLayoutEffect, useRef } from "react";

type Place = {
  top: number;
  left: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
};

const samePlace = (a: Place | null, b: Place | null) =>
  a !== null &&
  b !== null &&
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height &&
  a.frameWidth === b.frameWidth &&
  a.frameHeight === b.frameHeight;

// Where each bar's ground last stood, by bar: a view in the URL can remount
// the bar, and the ground should still slide from the segment it leaves.
const lastPlaces = new Map<string, Place & { at: number }>();
const REMOUNT_WINDOW_MS = 1000;

/**
 * The ground of the chosen segment of a `SegmentedControl`, sliding from one
 * segment to the next (Sacha, 05/11/2026). One layer the size of the frame,
 * cut to the chosen segment by `clip-path: inset(… round …)`: the corners
 * stay true whatever the width, nothing is laid out again. Same timing as
 * the tabs' underline (`--duration-slide`, `--ease-standard`), placed at once
 * when motion is reduced (the class says so). Until measured (server HTML),
 * the chosen segment paints its own ground; `data-ready` on the frame hands
 * it over to the layer. Segments carry `data-segment`.
 */
export function useSegmentIndicator(active: number, memoryKey?: string) {
  const frameRef = useRef<HTMLElement | null>(null);
  const groundRef = useRef<HTMLSpanElement>(null);
  const place = useRef<Place | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const ground = groundRef.current;
    if (!frame || !ground) return;

    const measure = (): Place | null => {
      const segment =
        frame.querySelectorAll<HTMLElement>("[data-segment]")[active];
      return segment
        ? {
            top: segment.offsetTop,
            left: segment.offsetLeft,
            width: segment.offsetWidth,
            height: segment.offsetHeight,
            frameWidth: frame.clientWidth,
            frameHeight: frame.clientHeight,
          }
        : null;
    };
    const put = (next: Place, animate: boolean) => {
      if (!animate) ground.style.transition = "none";
      const right = next.frameWidth - next.left - next.width;
      const bottom = next.frameHeight - next.top - next.height;
      ground.style.clipPath = `inset(${next.top}px ${right}px ${bottom}px ${next.left}px round var(--radius-md))`;
      if (!animate) {
        void ground.getBoundingClientRect();
        ground.style.transition = "";
      }
      place.current = next;
    };

    const next = measure();
    if (!next) {
      ground.style.opacity = "0";
      delete frame.dataset.ready;
      return;
    }
    const left = memoryKey ? lastPlaces.get(memoryKey) : undefined;
    const from =
      place.current ??
      (left && performance.now() - left.at < REMOUNT_WINDOW_MS ? left : null);
    // Nothing moves when the place is unchanged: a second run of the effect
    // (React strict mode) must not cut the slide in progress.
    if (from && !samePlace(from, place.current)) put(from, false);
    if (!samePlace(next, place.current)) put(next, from !== null);
    ground.style.opacity = "1";
    frame.dataset.ready = "";

    // Segments change width when the font loads or the bar wraps.
    const observer = new ResizeObserver(() => {
      const resized = measure();
      if (resized && !samePlace(resized, place.current)) put(resized, false);
    });
    observer.observe(frame);
    return () => {
      observer.disconnect();
      if (memoryKey && place.current)
        lastPlaces.set(memoryKey, { ...place.current, at: performance.now() });
    };
  }, [active, memoryKey]);

  return { frameRef, groundRef };
}
