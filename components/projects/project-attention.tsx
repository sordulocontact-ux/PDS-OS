import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * What the overview puts first once the Cadrage has left the owner's hands:
 * the Brief with the validator, or done — then the plan to build or the
 * plan launched. A finished Cadrage stays reachable but steps back
 * (ticket § 1: « il reste consultable mais devient visuellement secondaire »).
 */
export function ProjectAttention({
  projectId,
  state,
  validatorName,
  planLaunchedAt,
  canEdit,
}: {
  projectId: string;
  state: "awaiting" | "validated";
  validatorName: string | null;
  planLaunchedAt: string | null;
  canEdit: boolean;
}) {
  const t = fr.framingIntel.entry;
  const check = (label: string) => (
    <span className="flex items-center gap-2">
      <IconCheck
        aria-hidden
        className="size-4 text-[color:var(--tone-success-fg)]"
      />
      {label}
    </span>
  );

  if (state === "awaiting")
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-background p-5 md:p-8">
        <h2 className="text-display-sm font-semibold">
          {t.awaiting(validatorName ?? fr.framing.validation.validator)}
        </h2>
        <p className="text-body-md text-muted-foreground">{t.awaitingBody}</p>
        <Link
          href={routes.projectFramingBrief(projectId)}
          className={buttonVariants({ size: "lg", className: "self-start" })}
        >
          {t.seeBrief}
        </Link>
      </section>
    );

  if (planLaunchedAt)
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--surface-tint)] px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-md font-medium">
          {check(t.validated)}
          {check(t.framingDone)}
          {check(t.planLaunched(dateFormat.format(new Date(planLaunchedAt))))}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={routes.projectFramingBrief(projectId)}
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            {t.seeBrief}
          </Link>
          <Link
            href={routes.projectPlan(projectId)}
            className={buttonVariants({ size: "sm" })}
          >
            {t.seePlan}
          </Link>
        </div>
      </section>
    );

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 md:p-8">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
        {check(t.validated)}
        {check(t.framingDone)}
      </p>
      <div className="flex flex-col gap-2">
        <h2 className="text-display-sm font-semibold">{t.planNext}</h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {t.planBody}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={routes.projectPlan(projectId)}
          className={buttonVariants({ size: "lg" })}
        >
          {canEdit ? t.buildPlan : t.seePlan}
        </Link>
        <Link
          href={routes.projectFramingBrief(projectId)}
          className={buttonVariants({ size: "lg", variant: "ghost" })}
        >
          {t.seeBrief}
        </Link>
      </div>
    </section>
  );
}
