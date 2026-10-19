"use client";

import { CopyButton } from "@/components/ui/copy-button";
import { fr } from "@/lib/i18n/fr";

/** « Partager » the Brief de sortie: its internal link, copied (never public). */
export function ShareBrief({ path }: { path: string }) {
  const t = fr.strategyBriefOut.final;
  return (
    <CopyButton
      value={() => `${window.location.origin}${path}`}
      label={t.share}
      copiedLabel={t.shared}
      icon={null}
      variant="ghost"
      size="sm"
    />
  );
}
