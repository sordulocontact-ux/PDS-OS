import { DecisionControls } from "@/components/design/direction/decision-controls";
import { DecisionLine } from "@/components/design/direction/decision-line";
import { SectionContent } from "@/components/design/direction/section-content";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import type { DirectionSubmission } from "@/lib/design/direction";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

/**
 * One submitted version of the direction: its content as the database
 * froze it, the decisions taken on each section (or on the whole version
 * in global mode), and, for a validator, the controls of what is open.
 */
export function VersionCard({
  projectId,
  submission: s,
  isValidator,
  selfSubmitted = false,
  open,
}: {
  projectId: string;
  submission: DirectionSubmission;
  isValidator: boolean;
  // MKT-C2-08: the viewer submitted it and the governance forbids
  // approving one's own: told why instead of the controls.
  selfSubmitted?: boolean;
  // The latest version is shown unfolded.
  open: boolean;
}) {
  const t = fr.conceptionDirection.versions;
  const pending = s.status === "pending";
  const decisionOf = (section: string) =>
    s.decisions.find((d) => d.section === section);
  const whole = decisionOf("");

  return (
    <details
      open={open}
      className="group rounded-2xl border border-border bg-background"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-2xl px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-body-lg font-semibold tabular-nums">
          {t.label(s.number)}
        </span>
        <StatusBadge tone={designReviewTone[s.status]} size="sm">
          {fr.conception.directionStates[s.status]}
        </StatusBadge>
        <span className="text-caption text-muted-foreground">
          {t.submitted(s.submittedByName, formatDateTime(s.submittedAt))}
          {" · "}
          {fr.conception.validationModes[s.mode]}
        </span>
      </summary>
      <div className="flex flex-col gap-6 px-5 pt-1 pb-5">
        {s.snapshot.map((section) => {
          const decision = decisionOf(section.section);
          return (
            <section key={section.section} className="flex flex-col gap-3">
              <h4 className="text-body-md font-semibold">
                {section.title ?? fr.conceptionDirection.summary.direction}
              </h4>
              <SectionContent
                intentions={section.intentions}
                references={section.references.map((r) => ({
                  id: r.id,
                  label: r.title ?? r.fileName ?? r.url ?? "",
                  note: r.note,
                }))}
              />
              {s.mode === "per_section" &&
                (decision ? (
                  <DecisionLine decision={decision} />
                ) : pending && isValidator && selfSubmitted ? (
                  <p className="text-caption text-muted-foreground">
                    {fr.conceptionRoles.selfApproval}
                  </p>
                ) : pending && isValidator ? (
                  <DecisionControls
                    projectId={projectId}
                    submissionId={s.id}
                    section={section.section}
                  />
                ) : pending ? (
                  <p className="text-caption text-muted-foreground">
                    {t.awaiting}
                  </p>
                ) : null)}
            </section>
          );
        })}
        {s.mode === "global" &&
          (whole ? (
            <DecisionLine decision={whole} />
          ) : pending && isValidator && selfSubmitted ? (
            <p className="text-caption text-muted-foreground">
              {fr.conceptionRoles.selfApproval}
            </p>
          ) : pending && isValidator ? (
            <DecisionControls
              projectId={projectId}
              submissionId={s.id}
              section=""
            />
          ) : pending ? (
            <p className="text-caption text-muted-foreground">{t.awaiting}</p>
          ) : null)}
      </div>
    </details>
  );
}
