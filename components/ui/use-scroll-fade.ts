"use client";

import { useEffect, type RefObject } from "react";

// A column or a row too short for what it holds scrolls inside, and the
// edge with more to see fades out, as Vercel's and Supabase's sidebars
// (Sacha, 16/11/2026): `data-fade` on the scrolling box (start, end or
// both), read by the mask classes below. Nothing to scroll, no fade.
export function useScrollFade(
  ref: RefObject<HTMLElement | null>,
  axis: "x" | "y",
) {
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const edges = () => {
      const at = axis === "x" ? box.scrollLeft : box.scrollTop;
      const seen = axis === "x" ? box.clientWidth : box.clientHeight;
      const whole = axis === "x" ? box.scrollWidth : box.scrollHeight;
      const start = at > 1;
      const end = at + seen < whole - 1;
      const fade = start && end ? "both" : start ? "start" : end ? "end" : "";
      if (fade) box.dataset.fade = fade;
      else delete box.dataset.fade;
    };
    edges();
    box.addEventListener("scroll", edges, { passive: true });
    // The box and what it holds: a window resized, entries added.
    const observer = new ResizeObserver(edges);
    observer.observe(box);
    for (const child of box.children) observer.observe(child);
    return () => {
      box.removeEventListener("scroll", edges);
      observer.disconnect();
    };
  }, [ref, axis]);
}

/** The fade of a row (a bar of tabs), 2.5 rem at the edge with more. */
export const scrollFadeX =
  "data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)] data-[fade=end]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] data-[fade=start]:[mask-image:linear-gradient(to_left,black_calc(100%-2.5rem),transparent)]";

/** The fade of a column (a sidebar's entries), 2 rem at the edge with
 * more, its bar hidden. */
export const scrollFadeY =
  "scrollbar-hidden overflow-y-auto overscroll-contain data-[fade=both]:[mask-image:linear-gradient(to_bottom,transparent,black_2rem,black_calc(100%-2rem),transparent)] data-[fade=end]:[mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)] data-[fade=start]:[mask-image:linear-gradient(to_top,black_calc(100%-2rem),transparent)]";
