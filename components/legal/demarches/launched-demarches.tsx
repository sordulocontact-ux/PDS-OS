import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { Demarche } from "@/lib/legal/demarches/build";
import { journeyStatusTone } from "@/lib/ui/state-tones";

/** The démarches of a launched plan, each with its state and « Ouvrir »
 * to its step (proto « Projet complet », Plan d'action once launched). */
export function LaunchedDemarches({ demarches }: { demarches: Demarche[] }) {
  if (demarches.length === 0) return null;
  const t = fr.legalDemarches;
  return (
    <section className="flex flex-col gap-2" aria-label={t.groups.tracking}>
      <h3 className="text-[length:var(--type-body-sm)] font-semibold">
        {t.groups.tracking}
      </h3>
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
        {demarches.map((d) => (
          <li
            key={d.step.key}
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[length:var(--type-body-sm)] font-medium break-words">
                {d.step.title}
              </span>
              <StatusBadge tone={journeyStatusTone[d.step.status]} size="sm">
                {fr.journey.status[d.step.status]}
              </StatusBadge>
            </span>
            <ViewLink
              href={d.step.href}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {fr.journey.now.openShort}
            </ViewLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
