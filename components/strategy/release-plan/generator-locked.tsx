import Link from "next/link";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";

const fr = { strategyReleasePlan };

/** The generator is closed for now: why, and the way back. */
export function GeneratorLocked({
  projectId,
  reason,
  title,
}: {
  projectId: string;
  reason: string;
  // The document's own title (the Plan de sortie's by default).
  title?: string;
}) {
  const t = fr.strategyReleasePlan.locked;
  return (
    <section
      aria-labelledby="locked-title"
      className="flex flex-col items-start gap-4"
    >
      <h2 id="locked-title" className="text-display-sm font-semibold">
        {title ?? t.title}
      </h2>
      <ToneCallout tone="neutral">{reason}</ToneCallout>
      <Link
        href={routes.projectStrategy(projectId)}
        className={buttonVariants({ variant: "outline" })}
      >
        <ButtonRoll>{t.toStrategy}</ButtonRoll>
      </Link>
    </section>
  );
}
