import { buttonVariants } from "@/components/ui/button";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import { cn } from "@/lib/utils";

/**
 * Under the pilotage: the way to the Brief de sortie, open once every
 * dimension is at least started (lib/strategy/brief.ts), else what is
 * missing. Readers see it too: the Brief is the reference document.
 */
export function BriefEntry({
  projectId,
  missing,
}: {
  projectId: string;
  missing: StrategyDimension[];
}) {
  const t = fr.strategyBrief.entry;
  const ready = missing.length === 0;
  return (
    <section
      aria-labelledby="brief-entry-title"
      className={cn(
        sectionCardClass,
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="brief-entry-title" className="text-body-md font-semibold">
          {t.title}
        </h2>
        <p className="text-caption text-muted-foreground">
          {ready
            ? t.ready
            : t.notReady(
                missing
                  .map((d) => fr.strategyPilot.dimensions[d].toLowerCase())
                  .join(", "),
              )}
        </p>
      </div>
      {ready && (
        <ViewLink
          href={routes.projectStrategyBrief(projectId)}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          {t.open}
        </ViewLink>
      )}
    </section>
  );
}
