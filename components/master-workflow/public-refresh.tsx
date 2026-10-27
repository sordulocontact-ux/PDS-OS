"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";

const fr = { masterWorkflow };

// The engineer's page has no account, hence no live channel: it asks again
// every 30 seconds while it is in front, and says so (PROJ-BUG-08).
const EVERY_MS = 30_000;

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export function PublicRefresh() {
  const router = useRouter();
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setAt(new Date());
    };
    const timer = window.setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router]);
  return (
    <p
      aria-live="polite"
      className="text-caption text-[color:var(--text-secondary)]"
    >
      {fr.masterWorkflow.publicPackage.versions.refreshed(
        timeFormat.format(at),
      )}
    </p>
  );
}
