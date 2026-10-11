import Link from "next/link";

import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import type { BriefChange } from "@/lib/framing/brief-snapshot";
import { fr } from "@/lib/i18n/fr";

/**
 * Above the plan: the validated Brief it rests on no longer matches the
 * Cadrage (PROJ-BUG-04). Said with what changed; nothing is recomputed.
 */
export function BriefDrift({
  projectId,
  changes,
}: {
  projectId: string;
  changes: BriefChange[];
}) {
  const t = fr.framingIntel.drift;
  if (changes.length === 0) return null;
  return (
    <ToneCallout tone="warning" role="status">
      {t.body([...new Set(changes.map((c) => c.label))])}{" "}
      <Link
        href={routes.projectFramingBrief(projectId)}
        className="underline underline-offset-4"
      >
        {t.open}
      </Link>
    </ToneCallout>
  );
}
