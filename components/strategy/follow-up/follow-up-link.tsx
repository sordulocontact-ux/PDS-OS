import { buttonVariants } from "@/components/ui/button";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * On the validated strategy: the way to its follow-up (ticket § 14), where
 * the Stratégie becomes a system of watching and adapting.
 */
export function FollowUpLink({ projectId }: { projectId: string }) {
  const t = fr.strategyFollowUp;
  return (
    <section
      aria-labelledby="follow-up-link-title"
      className={cn(
        sectionCardClass,
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="follow-up-link-title" className="text-body-md font-semibold">
          {t.title}
        </h2>
        <p className="text-caption text-muted-foreground">{t.linkHint}</p>
      </div>
      <ViewLink
        href={routes.projectStrategyFollowUp(projectId)}
        className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
      >
        {t.link}
      </ViewLink>
    </section>
  );
}
