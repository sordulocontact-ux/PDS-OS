import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { framing } from "@/lib/i18n/fr/framing";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framing, framingIntel };

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * What the overview puts first once the Cadrage has left the owner's hands:
 * the Brief with the validator, or done. Once validated, a single line: the
 * Plan du projet sits right below it on the same page. A finished Cadrage
 * stays reachable but steps back (ticket § 1: « il reste consultable mais
 * devient visuellement secondaire »).
 */
export function ProjectAttention({
  projectId,
  state,
  validatorName,
  planLaunchedAt,
}: {
  projectId: string;
  state: "awaiting" | "validated";
  validatorName: string | null;
  planLaunchedAt: string | null;
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

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--surface-tint)] px-5 py-4">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-md font-medium">
        {check(t.validated)}
        {check(t.framingDone)}
        {planLaunchedAt &&
          check(t.planLaunched(dateFormat.format(new Date(planLaunchedAt))))}
      </p>
      <Link
        href={routes.projectFramingBrief(projectId)}
        className={buttonVariants({ size: "sm", variant: "ghost" })}
      >
        {t.seeBrief}
      </Link>
    </section>
  );
}
