"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  destinationFor,
  isAccessState,
  isOrganizationRole,
  routes,
  type AccessState,
  type OrganizationRole,
} from "@/lib/auth/redirects";

// Watches access and moves the person as soon as it changes: an approval
// given from another device lets them in, a suspension sends them out, a
// demotion removes the team screen. Renders nothing.
//
// Polling pauses while the tab is hidden and runs again right when it comes
// back.

export function AccessWatcher({
  current,
  role = null,
  intervalMs = 10_000,
}: {
  current: AccessState;
  role?: OrganizationRole | null;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;

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
        router.replace(destinationFor(payload.state));
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
  }, [current, role, intervalMs, router]);

  return null;
}
