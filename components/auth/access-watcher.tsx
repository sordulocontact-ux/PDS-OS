"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  destinationFor,
  isAccessState,
  isOrganizationRole,
  routes,
  safeReturnPath,
  unavailableFrom,
  type AccessState,
  type OrganizationRole,
} from "@/lib/auth/redirects";

// Watches access and moves the person as soon as it changes: an approval
// given from another device lets them in, a suspension sends them out, a
// demotion removes the team screen. Renders nothing.
//
// Polling pauses while the tab is hidden and runs again right when it comes
// back. A database that does not answer once is a blip, not an outage: only
// two « unavailable » in a row leave the page (which unmounts PO's
// conversation), and /unavailable remembers the page to return to
// (`returnTo`), instead of the home page.

export function AccessWatcher({
  current,
  role = null,
  intervalMs = 10_000,
  returnTo = null,
}: {
  current: AccessState;
  role?: OrganizationRole | null;
  intervalMs?: number;
  // On /unavailable: the page the person was on.
  returnTo?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let stopped = false;
    let unavailableInARow = 0;

    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const response = await fetch(routes.authState, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          state?: unknown;
          role?: unknown;
        };
        if (stopped || !isAccessState(payload.state)) return;
        const nextRole = isOrganizationRole(payload.role) ? payload.role : null;
        if (payload.state === current && nextRole === role) return;
        if (payload.state === "unavailable") {
          unavailableInARow += 1;
          if (unavailableInARow < 2) return;
          router.replace(unavailableFrom(pathname));
          return;
        }
        unavailableInARow = 0;
        router.replace(
          payload.state === "approved" && returnTo
            ? safeReturnPath(returnTo)
            : destinationFor(payload.state),
        );
        router.refresh();
      } catch {
        // Network failure: stay silent, the next tick retries.
      }
    }

    const timer = setInterval(check, intervalMs);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [current, role, intervalMs, router, pathname, returnTo]);

  return null;
}
