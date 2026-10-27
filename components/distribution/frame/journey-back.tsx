import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { routes } from "@/lib/auth/redirects";

const fr = { distributionJourney };

/** « ← Parcours » from a view of the journey's foot back to the step that
 * awaits the viewer (/release). */
export function JourneyBack({ projectId }: { projectId: string }) {
  return (
    <ViewLink
      href={routes.projectRelease(projectId)}
      className={buttonVariants({
        variant: "ghost",
        size: "sm",
        className: "self-start",
      })}
    >
      {fr.distributionJourney.back}
    </ViewLink>
  );
}
