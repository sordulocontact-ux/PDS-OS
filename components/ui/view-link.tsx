"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// How long the pointer rests on a link before its view is prepared: moving
// across a column of links (the project's navigation, a list of cards)
// must not render every page it passes over.
const REST_MS = 150;

// Link to another view of the same page (a project section, an artist tab,
// a step of the breadcrumb, a list filter): prefetched in full, data
// included, as soon as the person shows intent (pointer resting on it,
// keyboard focus, finger down), so the click shows the content at once
// instead of a loading state. Not on entering the viewport, nor on a pointer
// only passing over: every prefetch is a full render of the target (up to
// 200 database requests), and renders in parallel queue the database behind
// each other (page loads audit, docs/ARCHITECTURE.md § 3 bis). Kept fresh by
// experimental.staleTimes.static (next.config.ts) and emptied by every
// revalidatePath. Production only: `next dev` never prefetches.
export function ViewLink({
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onTouchStart,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = () => {
    if (rest.current) clearTimeout(rest.current);
    rest.current = null;
  };
  useEffect(() => stopWaiting, []);

  return (
    <Link
      {...props}
      prefetch={intent}
      onPointerEnter={(event) => {
        if (!intent && event.pointerType === "mouse") {
          stopWaiting();
          rest.current = setTimeout(() => setIntent(true), REST_MS);
        }
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        stopWaiting();
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
