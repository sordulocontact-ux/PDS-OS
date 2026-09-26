"use client";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

export default function ReleaseError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-3 rounded-xl border p-6"
    >
      <p className="font-medium">{fr.release.states.error}</p>
      <Button type="button" variant="outline" onClick={retry}>
        {fr.release.states.retry}
      </Button>
    </div>
  );
}
