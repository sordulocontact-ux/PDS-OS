import { ValidationPanel } from "@/components/framing/validation-panel";
import { sectionCardClass } from "@/components/ui/section-card";
import { briefRequestBlock } from "@/lib/design/brief-status";
import type { JourneyInput } from "@/lib/design/journey";
import type { PendingValidation } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * « Valider la conception » on the Conception's home (step 5 of the
 * journey): the decisions already taken on each object stay said
 * (MKT-C2-11), and the request carries an up-to-date Brief créatif
 * (MKT-C2-12).
 */
export function ConceptionValidationSection({
  projectId,
  stage,
  pendingValidation,
  mePersonId,
  input,
}: {
  projectId: string;
  stage: { id: string; state: string };
  pendingValidation: PendingValidation | null;
  mePersonId: string | null;
  input: Pick<JourneyInput, "direction" | "deliverables" | "brief">;
}) {
  return (
    <section
      id="conception-validation"
      aria-label={fr.conceptionJourney.validationTitle}
      className={cn(sectionCardClass, "scroll-mt-6")}
    >
      {/* MKT-C2-11: the decisions already taken stay visible. */}
      <div className="mb-4 flex flex-col gap-1 text-caption text-muted-foreground">
        <span className="font-medium text-foreground">
          {fr.conceptionRequests.localTitle}
        </span>
        <span>
          {fr.conceptionRequests.localDirection(
            fr.conception.directionStates[input.direction.state],
          )}
        </span>
        <span>
          {fr.conceptionRequests.localSheets(
            input.deliverables.filter(
              (d) =>
                d.sheet?.status === "ready_for_production" ||
                d.sheet?.status === "transferred",
            ).length,
            input.deliverables.length,
          )}
        </span>
        <span>{fr.conceptionRequests.localHint}</span>
      </div>
      <ValidationPanel
        stage={stage}
        pendingValidation={pendingValidation}
        projectId={projectId}
        mePersonId={mePersonId}
        title={fr.conceptionJourney.validationTitle}
        startLabel={fr.design.validation.start}
        // MKT-C2-12: the request carries an up-to-date Brief créatif.
        requestBlocked={briefRequestBlock(
          input.brief.latest,
          !input.brief.upToDate,
          fr.conceptionDirection.brief.document,
        )}
      />
    </section>
  );
}
