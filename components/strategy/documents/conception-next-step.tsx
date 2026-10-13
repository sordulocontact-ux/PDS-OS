import { buttonVariants } from "@/components/ui/button";
import { sectionCardClass } from "@/components/ui/section-card";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * The validated strategy's one next action (MKT-C2-01): « Passer à la
 * conception », saying what the Conception opens with — the deliverables
 * this strategy committed, the two ways in — and that the reference Brief
 * is left as it is. It opens the Conception's home, its explicit entry step
 * with the project's context; nothing starts before the owner chooses there
 * (start_design). Once started: « Reprendre la conception ».
 */
export function ConceptionNextStep({
  projectId,
  designState,
  isOwner,
  deliverableCount,
  briefVersion,
}: {
  projectId: string;
  // The Conception stage's state (project_stages), as stored.
  designState: string;
  isOwner: boolean;
  deliverableCount: number;
  briefVersion: number;
}) {
  const t = fr.strategyDocuments.validated.next;
  const notStarted = designState === "not_started";
  const running = designState === "in_progress";
  // The owner's main action while the Conception is open to work.
  const primary = isOwner && (notStarted || running);
  const label = !primary ? t.view : notStarted ? t.start : t.resume;
  const body = !notStarted
    ? running
      ? t.started
      : t.locked
    : isOwner
      ? t.body(deliverableCount)
      : t.readOnly;
  return (
    <section
      aria-labelledby="next-step-title"
      className={cn(
        sectionCardClass,
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h3 id="next-step-title" className="text-body-lg font-semibold">
          {t.title}
        </h3>
        <p className="max-w-prose text-body-md text-muted-foreground">{body}</p>
        {notStarted && isOwner && (
          <p className="text-caption text-muted-foreground">
            {t.keeps(briefVersion)}
          </p>
        )}
      </div>
      <ViewLink
        href={routes.projectDesign(projectId)}
        className={buttonVariants({
          size: "lg",
          variant: primary ? "default" : "outline",
          className: "shrink-0 self-start sm:self-center",
        })}
      >
        {label}
      </ViewLink>
    </section>
  );
}
