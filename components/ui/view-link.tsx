"use client";

import Link from "next/link";
import { useState } from "react";

// Link to another view of the same page (a project section, an artist tab,
// a step of the breadcrumb, a list filter): prefetched in full, data
// included, as soon as the person shows intent (pointer over it, keyboard
// focus, finger down), so the click shows the content at once instead of a
// loading state. Not on entering the viewport: a project page shows 15 to 20
// of these links, and rendering every target in the background queued the
// database behind the page the person actually opens (page loads audit,
// docs/ARCHITECTURE.md § 3 bis). Kept fresh by experimental.staleTimes.static
// (next.config.ts) and emptied by every revalidatePath. Production only:
// `next dev` never prefetches.
export function ViewLink({
  onPointerEnter,
  onFocus,
  onTouchStart,
  ...props
}: React.ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
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
