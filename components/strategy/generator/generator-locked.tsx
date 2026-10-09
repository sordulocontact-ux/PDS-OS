import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * A generator that cannot open: the Brief de sortie is not validated yet,
 * a version of it waits for its reviewers, or the person does not prepare
 * the document (they read the versions from the Documents page).
 */
export function GeneratorLocked({
  projectId,
  reason,
}: {
  projectId: string;
  reason: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <ToneCallout tone="neutral">{reason}</ToneCallout>
      <Link
        href={routes.projectStrategyDocuments(projectId)}
        className={buttonVariants({ size: "lg", variant: "outline" })}
      >
        {fr.strategyFlow.tabs.documents}
      </Link>
    </div>
  );
}
