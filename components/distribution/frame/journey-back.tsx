import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { routes } from "@/lib/auth/redirects";
import { withRelease } from "@/lib/distribution/scope";

const fr = { distributionJourney };

/** « ← Parcours » from a view of the journey's foot back to the step that
 * awaits the viewer (/release). */
export function JourneyBack({
  projectId,
  releaseId = null,
}: {
  projectId: string;
  // A collective's release (lot 15).
  releaseId?: string | null;
}) {
  return (
    <ViewLink
      href={withRelease(routes.projectRelease(projectId), releaseId)}
      className={buttonVariants({
        variant: "ghost",
        size: "sm",
        className: "self-start",
      })}
    >
      <ButtonRoll>{fr.distributionJourney.back}</ButtonRoll>
    </ViewLink>
  );
}
